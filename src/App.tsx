/**
 * Better Shot - Main Application Component
 *
 * Manages the core lifecycle and UI states:
 * - Onboarding flow (first launch)
 * - Main UI (capture buttons + shortcuts reference)
 * - Image editor (screenshot editing & annotation)
 * - Settings dialog (preferences & keyboard shortcuts)
 *
 * Window management:
 * - Main mode: 1200x800 with decorations (full application window)
 * - Editing mode: 1200x800 with editor interface
 * - Settings: Dialog overlay on main window
 *
 * Event flow:
 * - Keyboard shortcuts trigger capture modes
 * - Screenshots route through editor then save
 * - Settings persisted to OS-native storage
 */

import { editorActions } from "@/stores/editorStore";
import { isAssetId, isDataUrl, migrateStoredValue } from "@/lib/asset-registry";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";
import {
  availableMonitors,
  getCurrentWindow,
  LogicalSize,
  PhysicalPosition,
} from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { Store } from "@tauri-apps/plugin-store";
import { toast } from "sonner";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardShortcut } from "./components/preferences/KeyboardShortcutManager";
import { PreferencesPage } from "./components/preferences/PreferencesPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppWindowMac, Scan, Settings } from "lucide-react";

// Lazy load heavy components
const ImageEditor = lazy(() => import("./components/ImageEditor").then(m => ({ default: m.ImageEditor })));
const OnboardingFlow = lazy(() => import("./components/onboarding/OnboardingFlow").then(m => ({ default: m.OnboardingFlow })));

type AppMode = "main" | "editing" | "menu";
type CaptureMode = "fullscreen" | "window" | "region";

// Loading fallback for lazy loaded components
function LoadingFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Loading...</span>
      </div>
    </div>
  );
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { id: "show-menu", action: "Show Capture Menu", shortcut: "CommandOrControl+Shift+F", enabled: true },
];

/**
 * Restore main application window with full editor size
 * Called when entering editing mode or transitioning from onboarding
 */
async function restoreWindowOnScreen(mouseX?: number, mouseY?: number) {
  const appWindow = getCurrentWindow();
  const windowWidth = 600;
  const windowHeight = 120;
  await appWindow.setDecorations(true);
  await appWindow.setResizable(true);
  await appWindow.setMinSize(new LogicalSize(800, 600));
  await appWindow.setSize(new LogicalSize(windowWidth, windowHeight));
  if (mouseX !== undefined && mouseY !== undefined) {
    try {
      const monitors = await availableMonitors();

      const targetMonitor = monitors.find((monitor) => {
        const pos = monitor.position;
        const size = monitor.size;
        return (
          mouseX >= pos.x &&
          mouseX < pos.x + size.width &&
          mouseY >= pos.y &&
          mouseY < pos.y + size.height
        );
      });

      if (targetMonitor) {
        const scaleFactor = targetMonitor.scaleFactor;
        const physicalWindowWidth = windowWidth * scaleFactor;
        const physicalWindowHeight = windowHeight * scaleFactor;
        const centerX = targetMonitor.position.x + (targetMonitor.size.width - physicalWindowWidth) / 2;
        const centerY = targetMonitor.position.y + (targetMonitor.size.height - physicalWindowHeight) / 2;

        await appWindow.setPosition(new PhysicalPosition(centerX, centerY));
      } else {
        await appWindow.center();
      }
    } catch {
      await appWindow.center();
    }
  } else {
    await appWindow.center();
  }

  await appWindow.show();
  await appWindow.setFocus();
}

async function restoreWindow() {
  await restoreWindowOnScreen();
}

/**
 * Initialize main application window (1200x800)
 * Called on startup after onboarding or when exiting editing mode
 */
async function showNavbarWindow() {
  const appWindow = getCurrentWindow();
  await appWindow.setDecorations(true);
  await appWindow.setResizable(true);
  await appWindow.setMinSize(new LogicalSize(800, 600));
  await appWindow.setSize(new LogicalSize(1200, 800));
  await appWindow.center();
  await appWindow.show();
  await appWindow.setFocus();
}

async function showQuickOverlay(
  screenshotPath: string,
  mouseX?: number,
  mouseY?: number,
) {
  /**
   * Display quick overlay window for immediate screenshot preview
   * Positioned in screen corner with pre-saved screenshot available
   */
  try {
    const store = await Store.load("settings.json", {
      defaults: {},
      autoSave: true,
    });
    await store.set("lastCapturePath", screenshotPath);
    await store.save();
  } catch (error) {
    console.error("Failed to persist last capture path:", error);
  }

  try {
    await emitTo("quick-overlay", "overlay-show-capture", {
      path: screenshotPath,
    });
  } catch (error) {
    console.error("Failed to emit overlay event:", error);
  }

  try {
    const { getAllWebviewWindows } = await import(
      "@tauri-apps/api/webviewWindow"
    );
    const allWindows = await getAllWebviewWindows();
    const overlay = allWindows.find((win) => win.label === "quick-overlay");

    if (!overlay) {
      console.error("Quick overlay window not found");
      return;
    }

    const overlayWidth = 360;
    const overlayHeight = 240;
    const margin = 16;

    let targetX: number;
    let targetY: number;

    try {
      const monitors = await availableMonitors();
      let targetMonitor = monitors[0];

      if (mouseX !== undefined && mouseY !== undefined) {
        const foundMonitor = monitors.find((monitor) => {
          const pos = monitor.position;
          const size = monitor.size;
          return (
            mouseX >= pos.x &&
            mouseX < pos.x + size.width &&
            mouseY >= pos.y &&
            mouseY < pos.y + size.height
          );
        });
        if (foundMonitor) {
          targetMonitor = foundMonitor;
        }
      }

      const scaleFactor = targetMonitor.scaleFactor;
      const physicalWidth = overlayWidth * scaleFactor;
      const physicalHeight = overlayHeight * scaleFactor;
      const physicalMargin = margin * scaleFactor;

      targetX =
        targetMonitor.position.x +
        targetMonitor.size.width -
        physicalWidth -
        physicalMargin;

      targetY =
        targetMonitor.position.y +
        targetMonitor.size.height -
        physicalHeight -
        physicalMargin;
    } catch (error) {
      console.error("Failed to position overlay using monitors:", error);
      const appWindow = getCurrentWindow();
      const size = await appWindow.outerSize();
      const scaleFactor = await appWindow.scaleFactor();
      const physicalWidth = overlayWidth * scaleFactor;
      const physicalHeight = overlayHeight * scaleFactor;
      const physicalMargin = margin * scaleFactor;
      const position = await appWindow.outerPosition();
      targetX = position.x + size.width - physicalWidth - physicalMargin;
      targetY = position.y + size.height - physicalHeight - physicalMargin;
    }

    await overlay.setSize(new LogicalSize(overlayWidth, overlayHeight));
    await overlay.setPosition(new PhysicalPosition(targetX, targetY));
    await overlay.setAlwaysOnTop(true);
    await overlay.show();
    await overlay.setFocus();
  } catch (error) {
    console.error("Failed to show quick overlay:", error);
  }
}

function App() {
  const [mode, setMode] = useState<AppMode>("main");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveDir, setSaveDir] = useState<string>("");
  const [copyToClipboard, setCopyToClipboard] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [tempScreenshotPath, setTempScreenshotPath] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(DEFAULT_SHORTCUTS);
  const [tempDir, setTempDir] = useState<string>("/tmp");
  const [selectedPresetSize, setSelectedPresetSize] = useState<{ width: number; height: number; name: string } | null>(null);

  // Refs to hold current values for use in callbacks that may have stale closures
  const settingsRef = useRef({ saveDir, copyToClipboard, tempDir });
  const registeredShortcutsRef = useRef<Set<string>>(new Set());
  const lastCaptureTimeRef = useRef(0);
  const handleCaptureRef = useRef<((captureMode?: CaptureMode) => Promise<void>) | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    settingsRef.current = { saveDir, copyToClipboard, tempDir };
  }, [saveDir, copyToClipboard, tempDir]);

  // Load settings function

  // Initial app setup
  useEffect(() => {
    const initializeApp = async () => {
      // First get the desktop path as the default
      let desktopPath = "";
      try {
        desktopPath = await invoke<string>("get_desktop_directory");
      } catch (err) {
        console.error("Failed to get Desktop directory:", err);
      }

      // Get the system temp directory (canonicalized to resolve symlinks)
      try {
        const systemTempDir = await invoke<string>("get_temp_directory");
        setTempDir(systemTempDir);
      } catch (err) {
        console.error("Failed to get temp directory, using fallback:", err);
        // Keep the default /tmp fallback
      }

      // Load settings from store
      try {
        const store = await Store.load("settings.json", {
          defaults: {
            copyToClipboard: true,
          },
          autoSave: true,
        });

        const savedCopyToClip = await store.get<boolean>("copyToClipboard");
        if (savedCopyToClip !== null && savedCopyToClip !== undefined) {
          setCopyToClipboard(savedCopyToClip);
        }

        // Only use saved directory if it's a non-empty string, otherwise use desktop
        const savedSaveDir = await store.get<string>("saveDir");
        if (savedSaveDir && savedSaveDir.trim() !== "") {
          setSaveDir(savedSaveDir);
        } else {
          // Use desktop as default and save it
          setSaveDir(desktopPath);
          if (desktopPath) {
            await store.set("saveDir", desktopPath);
            await store.save();
          }
        }

        const savedShortcuts = await store.get<KeyboardShortcut[]>("keyboardShortcuts");
        if (savedShortcuts && savedShortcuts.length > 0) {
          setShortcuts(savedShortcuts);
        }

        // Migrate legacy background image paths to asset IDs
        const savedBackgroundImage = await store.get<string>("defaultBackgroundImage");
        if (savedBackgroundImage && !isAssetId(savedBackgroundImage) && !isDataUrl(savedBackgroundImage)) {
          // This is a legacy path that needs migration
          const migratedValue = migrateStoredValue(savedBackgroundImage);
          if (migratedValue && migratedValue !== savedBackgroundImage) {
            console.log(`Migrating background image: ${savedBackgroundImage} -> ${migratedValue}`);
            await store.set("defaultBackgroundImage", migratedValue);
            await store.save();
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        // Still set desktop as fallback
        if (desktopPath) {
          setSaveDir(desktopPath);
        }
      }
    };

    initializeApp();

    const shouldShowOnboarding = !hasCompletedOnboarding();
    if (shouldShowOnboarding) {
      setShowOnboarding(true);
    } else {
      // Resize & show the compact toolbar
      showNavbarWindow();
    }

    // DEV ONLY: Uncomment to test editor with any image file
    // setTempScreenshotPath("/Users/montimage/Desktop/bettershot_1768263844426.png");
    // setMode("editing");
  }, []);

  const handleCapture = useCallback(async (captureMode: CaptureMode = "fullscreen") => {
    /**
     * Main capture flow:
     * 1. Debounce to prevent rapid consecutive captures
     * 2. Hide app window to capture clean screen
     * 3. Invoke Tauri command to capture screenshot
     * 4. Route screenshot to editor via mode transition
     */
    const now = Date.now();
    if (now - lastCaptureTimeRef.current < 600) {
      return;
    }
    lastCaptureTimeRef.current = now;

    if (isCapturing) return;

    setIsCapturing(true);

    const appWindow = getCurrentWindow();

    // Read current settings from ref to avoid stale closure issues
    const { tempDir: currentTempDir } = settingsRef.current;

    try {
      await appWindow.hide();
      await new Promise((resolve) => setTimeout(resolve, 400));

      const commandMap: Record<CaptureMode, string> = {
        fullscreen: "native_capture_fullscreen",
        window: "native_capture_window",
        region: "native_capture_interactive",
      };

      const screenshotPath = await invoke<string>(commandMap[captureMode], {
        saveDir: currentTempDir,
      });

      // Get mouse position IMMEDIATELY after screenshot completes
      // This captures where the user finished their selection
      let mouseX: number | undefined;
      let mouseY: number | undefined;
      try {
        const [x, y] = await invoke<[number, number]>("get_mouse_position");
        mouseX = x;
        mouseY = y;
      } catch {
        // Silently fail - will fall back to centering
      }

      invoke("play_screenshot_sound").catch(console.error);

      setTempScreenshotPath(screenshotPath);
      setMode("editing");
      try {
        await invoke("move_window_to_active_space");
      } catch {
      }
      await restoreWindowOnScreen(mouseX, mouseY);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("cancelled") || errorMessage.includes("was cancelled")) {
        await restoreWindow();
      } else if (errorMessage.includes("already in progress")) {
        toast.error("Screenshot already in progress", {
          description: "Please wait for the current screenshot to complete",
        });
        await restoreWindow();
      } else if (
        errorMessage.toLowerCase().includes("permission") ||
        errorMessage.toLowerCase().includes("access") ||
        errorMessage.toLowerCase().includes("denied")
      ) {
        toast.error("Permission required", {
          description: "Please go to System Settings > Privacy & Security > Screen Recording and enable access for Better Shot, then restart the app.",
          duration: 6000,
        });
        await restoreWindow();
      } else {
        toast.error("Screenshot failed", {
          description: errorMessage,
        });
        await restoreWindow();
      }
    } finally {
      setIsCapturing(false);
    }
  }, [settingsRef, lastCaptureTimeRef]);

  // Setup hotkeys whenever settings change
  useEffect(() => {
    const setupHotkeys = async () => {
      try {
        const shortcutsToUnregister = Array.from(registeredShortcutsRef.current);
        if (shortcutsToUnregister.length > 0) {
          try {
            await unregister(shortcutsToUnregister);
          } catch (err) {
            console.error("Failed to unregister shortcuts:", err);
          }
        }
        registeredShortcutsRef.current.clear();

        for (const shortcut of shortcuts) {
          if (!shortcut.enabled) continue;

          if (shortcut.id === "show-menu") {
            try {
              await register(shortcut.shortcut, async () => {
                await showNavbarWindow();
              });
              registeredShortcutsRef.current.add(shortcut.shortcut);
            } catch (err) {
              console.error(
                `Failed to register shortcut ${shortcut.shortcut}:`,
                err
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to setup hotkeys:", err);
        toast.error("Failed to setup hotkeys", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    };

    setupHotkeys();

    return () => {
      const shortcutsToUnregister = Array.from(registeredShortcutsRef.current);
      if (shortcutsToUnregister.length > 0) {
        unregister(shortcutsToUnregister).catch(console.error);
      }
      registeredShortcutsRef.current.clear();
    };
  }, [shortcuts]);

  // Update ref whenever handleCapture changes
  useEffect(() => {
    handleCaptureRef.current = handleCapture;
  }, [handleCapture]);

  useEffect(() => {
    let unlisten1: (() => void) | null = null;
    let unlisten2: (() => void) | null = null;
    let unlisten3: (() => void) | null = null;
    let unlisten4: (() => void) | null = null;
    let mounted = true;

    const setupListeners = async () => {
      // Use refs to always call the latest handler without re-registering
      unlisten1 = await listen("capture-fullscreen", () => {
        if (mounted && handleCaptureRef.current) handleCaptureRef.current("fullscreen");
      });
      unlisten2 = await listen("capture-window", () => {
        if (mounted && handleCaptureRef.current) handleCaptureRef.current("window");
      });
      unlisten3 = await listen<{ path: string }>("open-editor-for-path", async (event) => {
        if (!mounted) return;
        const { path } = event.payload;
        setTempScreenshotPath(path);
        setMode("editing");
        try {
          await invoke("move_window_to_active_space");
        } catch {
        }
        await restoreWindow();
      });
      unlisten4 = await listen("show-last-capture-overlay", async () => {
        if (!mounted) return;
        try {
          const store = await Store.load("settings.json");
          const lastPath = await store.get<string>("lastCapturePath");
          if (lastPath) {
            await showQuickOverlay(lastPath);
          }
        } catch (error) {
          console.error("Failed to show last capture overlay:", error);
        }
      });

      await listen("open-preferences", () => {
        if (!mounted) return;
        setSettingsOpen(true);
      });

      await listen("show-navbar", async () => {
        if (!mounted) return;
        await showNavbarWindow();
      });
    };

    setupListeners();

    return () => {
      mounted = false;
      unlisten1?.();
      unlisten2?.();
      unlisten3?.();
      unlisten4?.();
    };
  }, []); // Empty dependency array - only run once on mount

  // Reload shortcuts when settings dialog closes
  const prevSettingsOpenRef = useRef(false);
  useEffect(() => {
    if (prevSettingsOpenRef.current && !settingsOpen) {
      Store.load("settings.json")
        .then((store) => store.get<KeyboardShortcut[]>("keyboardShortcuts"))
        .then((saved) => {
          if (saved && saved.length > 0) setShortcuts(saved);
        })
        .catch(console.error);
    }
    prevSettingsOpenRef.current = settingsOpen;
  }, [settingsOpen]);

  // Adjust window size when mode changes
  useEffect(() => {
    const adjustWindow = async () => {
      if (mode === "editing") {
        await restoreWindowOnScreen();
      } else if (mode === "main") {
        await showNavbarWindow();
      }
    };
    adjustWindow();
  }, [mode]);

  // Adjust window for onboarding
  useEffect(() => {
    const adjustOnboarding = async () => {
      if (showOnboarding) {
        // Show full-size window for onboarding
        const appWindow = getCurrentWindow();
        await appWindow.setDecorations(true);
        await appWindow.setResizable(true);
        await appWindow.setMinSize(new LogicalSize(800, 600));
        await appWindow.setSize(new LogicalSize(1200, 800));
        await appWindow.center();
        await appWindow.show();
        await appWindow.setFocus();
      }
    };
    adjustOnboarding();
  }, [showOnboarding]);

  async function handleEditorSave(editedImageData: string) {
    /**
     * Save edited image:
     * 1. Invoke Rust command to save with effects
     * 2. Copy to clipboard if enabled
     * 3. Return to main UI
     * 4. Reset editor state
     */
    try {
      const savedPath = await invoke<string>("save_edited_image", {
        imageData: editedImageData,
        saveDir,
        copyToClip: copyToClipboard,
      });

      toast.success("Image saved", {
        description: savedPath,
        duration: 4000,
      });

      editorActions.reset();
      setMode("main");
      setTempScreenshotPath(null);
      await showNavbarWindow();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Failed to save image", {
        description: errorMessage,
        duration: 5000,
      });
      editorActions.reset();
      setMode("main");
      await showNavbarWindow();
    }
  }

  async function handleEditorCancel() {
    editorActions.reset();
    setMode("main");
    setTempScreenshotPath(null);
    await showNavbarWindow();
  }


  if (showOnboarding) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            showNavbarWindow();
          }}
        />
      </Suspense>
    );
  }

  if (mode === "editing" && tempScreenshotPath) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ImageEditor
          imagePath={tempScreenshotPath}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          presetSize={selectedPresetSize}
          onPresetApplied={() => setSelectedPresetSize(null)}
        />
      </Suspense>
    );
  }

  return (
    // Main application UI (mode="main")
    // Displays: capture buttons, shortcuts reference, settings dialog
    <main className="h-dvh w-full flex flex-col items-center justify-center px-6 bg-background relative">
      {/* Settings button - top right */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          <Settings className="size-5" aria-hidden="true" />
        </Button>

        <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preferences</DialogTitle>
          </DialogHeader>
          <PreferencesPage
            onSettingsChange={() => {
              Store.load("settings.json")
                .then((store) => store.get<KeyboardShortcut[]>("keyboardShortcuts"))
                .then((saved) => {
                  if (saved && saved.length > 0) setShortcuts(saved);
                })
                .catch(console.error);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <div className="text-center space-y-8 max-w-2xl">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Better Shot</h1>
          <p className="text-muted-foreground">Capture, edit, and annotate your screenshots with professional quality.</p>
        </div>

        {/* Three capture buttons */}
        <div className="grid grid-cols-3 gap-4">
          <Button
            onClick={() => handleCapture("region")}
            disabled={isCapturing}
            className="h-12 gap-2 rounded-lg"
          >
            <Scan className="size-4" aria-hidden="true" />
            Region
          </Button>
          <Button
            onClick={() => handleCapture("fullscreen")}
            disabled={isCapturing}
            className="h-12 gap-2 rounded-lg"
            variant="default"
          >
            <div className="size-3 rounded-full" aria-hidden="true" />
            Screen
          </Button>
          <Button
            onClick={() => handleCapture("window")}
            disabled={isCapturing}
            className="h-12 gap-2 rounded-lg"
          >
            <AppWindowMac className="size-4" aria-hidden="true" />
            Window
          </Button>
        </div>

        {/* Auto-apply background checkbox */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <input
            type="checkbox"
            id="auto-background"
            className="size-4 rounded border-border"
            defaultChecked
          />
          <label htmlFor="auto-background" className="text-muted-foreground cursor-pointer">
            Auto-apply background
            <span className="text-xs text-muted-foreground/70 ml-1">(Apply default background and save instantly)</span>
          </label>
        </div>

        {/* Keyboard shortcuts */}
        <div className="border-t border-border pt-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Region</span>
              <kbd className="px-2 py-1 bg-secondary border border-border rounded text-foreground font-mono text-xs">
                ⌘⇧2
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Screen</span>
              <kbd className="px-2 py-1 bg-secondary border border-border rounded text-foreground font-mono text-xs">
                ⌘⇧F
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Window</span>
              <kbd className="px-2 py-1 bg-secondary border border-border rounded text-foreground font-mono text-xs">
                ⌘⇧D
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cancel</span>
              <kbd className="px-2 py-1 bg-secondary border border-border rounded text-foreground font-mono text-xs">
                Esc
              </kbd>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Save</span>
              <kbd className="px-2 py-1 bg-secondary border border-border rounded text-foreground font-mono text-xs">
                ⌘S
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Copy</span>
              <kbd className="px-2 py-1 bg-secondary border border-border rounded text-foreground font-mono text-xs">
                ⌘⇧C
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Undo</span>
              <kbd className="px-2 py-1 bg-secondary border border-border rounded text-foreground font-mono text-xs">
                ⌘Z
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Redo</span>
              <kbd className="px-2 py-1 bg-secondary border border-border rounded text-foreground font-mono text-xs">
                ⌘⇧Z
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
