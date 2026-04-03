import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ChevronDown } from "lucide-react";

import type { PresetSize } from "@/hooks/usePresetSizes";

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegionSelectorProps {
  onSelect: (region: Region) => void;
  onCancel: () => void;
  monitorShots: {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    scale_factor: number;
    path: string;
  }[];
  presetSizes?: PresetSize[];
  onPresetSelect?: (preset: PresetSize) => void;
}

export function RegionSelector({ onSelect, onCancel, monitorShots, presetSizes = [], onPresetSelect }: RegionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // UI state
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Selection state stored in refs for performance
  const isSelectingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const needsUpdateRef = useRef(false);
  const isMovingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Get selected preset for aspect ratio locking
  const selectedPreset = useMemo(
    () => presetSizes.find(p => p.id === selectedPresetId),
    [presetSizes, selectedPresetId]
  );

  // Calculate bounds for multi-monitor
  const bounds = useMemo(() => {
    if (!monitorShots.length) return { minX: 0, minY: 0, width: 0, height: 0 };
    const result = monitorShots.reduce(
      (acc, s) => ({
        minX: Math.min(acc.minX, s.x),
        minY: Math.min(acc.minY, s.y),
        maxX: Math.max(acc.maxX, s.x + s.width),
        maxY: Math.max(acc.maxY, s.y + s.height),
      }),
      {
        minX: monitorShots[0].x,
        minY: monitorShots[0].y,
        maxX: monitorShots[0].x + monitorShots[0].width,
        maxY: monitorShots[0].y + monitorShots[0].height,
      }
    );
    return {
      minX: result.minX,
      minY: result.minY,
      width: result.maxX - result.minX,
      height: result.maxY - result.minY,
    };
  }, [monitorShots]);

  // Initialize fixed size frame position when preset is selected
  useEffect(() => {
    if (selectedPreset && bounds.width > 0 && bounds.height > 0) {
      // Center the frame on the screen
      const centerX = bounds.minX + bounds.width / 2;
      const centerY = bounds.minY + bounds.height / 2;
      const frameX = centerX - selectedPreset.width / 2;
      const frameY = centerY - selectedPreset.height / 2;

      startRef.current = { x: frameX, y: frameY };
      currentRef.current = { x: frameX + selectedPreset.width, y: frameY + selectedPreset.height };
      needsUpdateRef.current = true;
    }
  }, [selectedPreset, bounds]);

  // Normalized shots for rendering
  const normalizedShots = useMemo(
    () =>
      monitorShots.map((shot) => ({
        ...shot,
        left: shot.x - bounds.minX,
        top: shot.y - bounds.minY,
        url: convertFileSrc(shot.path),
      })),
    [monitorShots, bounds.minX, bounds.minY]
  );

  // Canvas rendering loop - runs on RAF for smooth updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Set canvas size to match container
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = bounds.width * dpr;
      canvas.height = bounds.height * dpr;
      canvas.style.width = `${bounds.width}px`;
      canvas.style.height = `${bounds.height}px`;
      ctx.scale(dpr, dpr);
    };
    updateCanvasSize();

    const render = () => {
      if (!needsUpdateRef.current && isSelectingRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, bounds.width, bounds.height);

      if (isSelectingRef.current || needsUpdateRef.current) {
        const x = Math.min(startRef.current.x, currentRef.current.x);
        const y = Math.min(startRef.current.y, currentRef.current.y);
        const width = Math.abs(currentRef.current.x - startRef.current.x);
        const height = Math.abs(currentRef.current.y - startRef.current.y);

        if (width > 0 && height > 0) {
          // Draw dark overlay with cutout (using composite operation for performance)
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

          // Top
          ctx.fillRect(0, 0, bounds.width, y);
          // Left
          ctx.fillRect(0, y, x, height);
          // Right
          ctx.fillRect(x + width, y, bounds.width - x - width, height);
          // Bottom
          ctx.fillRect(0, y + height, bounds.width, bounds.height - y - height);

          // Selection border
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);

          // Corner handles
          const handleSize = 6;
          ctx.fillStyle = "#3b82f6";
          const corners = [
            [x - handleSize/2, y - handleSize/2],
            [x + width - handleSize/2, y - handleSize/2],
            [x - handleSize/2, y + height - handleSize/2],
            [x + width - handleSize/2, y + height - handleSize/2],
          ];
          corners.forEach(([cx, cy]) => {
            ctx.fillRect(cx, cy, handleSize, handleSize);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.strokeRect(cx, cy, handleSize, handleSize);
          });

          // Dimension label
          const label = `${Math.round(width)} × ${Math.round(height)}${selectedPreset ? ` (${selectedPreset.name})` : ''}`;
          ctx.font = "12px ui-monospace, monospace";
          const textMetrics = ctx.measureText(label);
          const labelPadding = 8;
          const labelHeight = 20;
          const labelWidth = textMetrics.width + labelPadding * 2;
          const labelX = x + width / 2 - labelWidth / 2;
          const labelY = y - labelHeight - 8;

          if (labelY > 0) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.beginPath();
            ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
            ctx.fill();

            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, x + width / 2, labelY + labelHeight / 2);
          }
        }
        needsUpdateRef.current = false;
      } else {
        // No selection - just draw the overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, bounds.width, bounds.height);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [bounds.width, bounds.height]);

  // Event handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();

      if (selectedPreset) {
        // Fixed size mode - check if clicking on the existing frame to move it
        const x = startRef.current.x;
        const y = startRef.current.y;
        const width = selectedPreset.width;
        const height = selectedPreset.height;

        // Check if click is inside the frame
        if (
          e.clientX >= x &&
          e.clientX <= x + width &&
          e.clientY >= y &&
          e.clientY <= y + height
        ) {
          // Start moving the frame
          isMovingRef.current = true;
          dragOffsetRef.current = {
            x: e.clientX - x,
            y: e.clientY - y,
          };
          needsUpdateRef.current = true;
          return;
        }
      }

      // Normal selection mode
      isSelectingRef.current = true;
      startRef.current = { x: e.clientX, y: e.clientY };
      currentRef.current = { x: e.clientX, y: e.clientY };
      needsUpdateRef.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMovingRef.current) {
        // Moving fixed size frame
        const width = selectedPreset?.width || 0;
        const height = selectedPreset?.height || 0;

        let newX = e.clientX - dragOffsetRef.current.x;
        let newY = e.clientY - dragOffsetRef.current.y;

        // Clamp to bounds
        newX = Math.max(bounds.minX, Math.min(newX, bounds.minX + bounds.width - width));
        newY = Math.max(bounds.minY, Math.min(newY, bounds.minY + bounds.height - height));

        startRef.current = { x: newX, y: newY };
        currentRef.current = { x: newX + width, y: newY + height };
        needsUpdateRef.current = true;
        return;
      }

      if (!isSelectingRef.current) return;

      let newX = e.clientX;
      let newY = e.clientY;

      // Apply aspect ratio constraint if preset selected
      if (selectedPreset && !isMovingRef.current) {
        const aspectRatio = selectedPreset.width / selectedPreset.height;
        let width = newX - startRef.current.x;
        let height = newY - startRef.current.y;

        if (Math.abs(width) > Math.abs(height) * aspectRatio) {
          // Width is limiting
          height = width / aspectRatio;
        } else {
          // Height is limiting
          width = height * aspectRatio;
        }

        newX = startRef.current.x + width;
        newY = startRef.current.y + height;
      }

      currentRef.current = { x: newX, y: newY };
      needsUpdateRef.current = true;
    };

    const handleMouseUp = () => {
      if (isMovingRef.current) {
        isMovingRef.current = false;
        // Confirm the moved frame
        if (selectedPreset) {
          const x = startRef.current.x;
          const y = startRef.current.y;
          onSelect({
            x,
            y,
            width: selectedPreset.width,
            height: selectedPreset.height,
          });
          onPresetSelect?.(selectedPreset);
        }
        return;
      }

      if (!isSelectingRef.current) return;
      isSelectingRef.current = false;

      const x = Math.min(startRef.current.x, currentRef.current.x);
      const y = Math.min(startRef.current.y, currentRef.current.y);
      const width = Math.abs(currentRef.current.x - startRef.current.x);
      const height = Math.abs(currentRef.current.y - startRef.current.y);

      if (width > 10 && height > 10) {
        if (selectedPreset) {
          onPresetSelect?.(selectedPreset);
        }
        onSelect({
          x: x + bounds.minX,
          y: y + bounds.minY,
          width,
          height,
        });
      } else {
        // Reset selection if too small
        needsUpdateRef.current = true;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bounds.minX, bounds.minY, onSelect, onCancel, selectedPreset, onPresetSelect]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 cursor-crosshair select-none overflow-hidden"
    >
      {/* Screenshot backgrounds */}
      {normalizedShots.map((shot) => (
        <img
          key={shot.id}
          src={shot.url}
          alt=""
          draggable={false}
          className="absolute select-none pointer-events-none"
          style={{
            left: shot.left,
            top: shot.top,
            width: shot.width,
            height: shot.height,
          }}
        />
      ))}

      {/* Canvas overlay for selection - GPU accelerated */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Preset Sizes Menu - Top Left */}
      {presetSizes.length > 0 && (
        <div className="fixed top-6 left-6 z-50">
          <div className="relative">
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-black/70 hover:bg-black/80 text-white rounded-lg text-sm border border-blue-500/50 pointer-events-auto transition-colors"
            >
              <span className="font-medium">
                {selectedPreset ? selectedPreset.name : "Choose Size"}
              </span>
              <ChevronDown className="size-4" />
            </button>

            {showPresetMenu && (
              <div className="absolute top-full mt-2 bg-black/90 border border-blue-500/50 rounded-lg overflow-hidden pointer-events-auto">
                <button
                  onClick={() => {
                    setSelectedPresetId(null);
                    setShowPresetMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-blue-600/30 text-white text-sm transition-colors"
                >
                  Free Selection
                </button>
                {presetSizes.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setShowPresetMenu(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      selectedPresetId === preset.id
                        ? "bg-blue-600/50 text-white font-medium"
                        : "hover:bg-blue-600/30 text-white"
                    }`}
                  >
                    <div>{preset.name}</div>
                    <div className="text-xs text-gray-400">{preset.width} × {preset.height}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
        {selectedPreset
          ? `${selectedPreset.name} · Drag to move · ESC to cancel`
          : "Drag to select · ESC to cancel"}
      </div>
    </div>
  );
}
