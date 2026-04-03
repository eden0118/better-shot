import { useEffect, useRef, useState, useCallback } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { toast } from "sonner";

export interface PresetSize {
  id: string;
  name: string;
  width: number;
  height: number;
}

const DEFAULT_PRESET_SIZES: PresetSize[] = [];

export function usePresetSizes() {
  const [presetSizes, setPresetSizes] =
    useState<PresetSize[]>(DEFAULT_PRESET_SIZES);
  const [isLoading, setIsLoading] = useState(true);
  const storeRef = useRef<Store | null>(null);

  // Load preset sizes from storage
  useEffect(() => {
    const loadPresetSizes = async () => {
      try {
        const store = await Store.load("settings.json");
        storeRef.current = store;

        const saved = await store.get<PresetSize[]>("presetSizes");
        if (saved) {
          setPresetSizes(saved);
        }
      } catch (err) {
        console.error("Failed to load preset sizes:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPresetSizes();
  }, []);

  // Add preset size
  const addPresetSize = useCallback(
    async (name: string, width: number, height: number) => {
      if (!name.trim()) {
        toast.error("Please enter a name for the preset size");
        return;
      }

      if (width <= 0 || height <= 0) {
        toast.error("Width and height must be greater than 0");
        return;
      }

      const newPreset: PresetSize = {
        id: `preset-${Date.now()}`,
        name: name.trim(),
        width,
        height,
      };

      const updated = [...presetSizes, newPreset];
      setPresetSizes(updated);

      try {
        const store = await Store.load("settings.json");
        await store.set("presetSizes", updated);
        await store.save();
        toast.success(`Added preset size: ${name}`);
      } catch (err) {
        console.error("Failed to save preset size:", err);
        toast.error("Failed to save preset size");
        // Revert on failure
        setPresetSizes(presetSizes);
      }
    },
    [presetSizes],
  );

  // Update preset size
  const updatePresetSize = useCallback(
    async (id: string, name: string, width: number, height: number) => {
      if (!name.trim()) {
        toast.error("Please enter a name for the preset size");
        return;
      }

      if (width <= 0 || height <= 0) {
        toast.error("Width and height must be greater than 0");
        return;
      }

      const updated = presetSizes.map((p) =>
        p.id === id ? { ...p, name: name.trim(), width, height } : p,
      );
      setPresetSizes(updated);

      try {
        const store = await Store.load("settings.json");
        await store.set("presetSizes", updated);
        await store.save();
        toast.success("Preset size updated");
      } catch (err) {
        console.error("Failed to update preset size:", err);
        toast.error("Failed to update preset size");
        // Revert on failure
        setPresetSizes(presetSizes);
      }
    },
    [presetSizes],
  );

  // Delete preset size
  const deletePresetSize = useCallback(
    async (id: string) => {
      const updated = presetSizes.filter((p) => p.id !== id);
      setPresetSizes(updated);

      try {
        const store = await Store.load("settings.json");
        await store.set("presetSizes", updated);
        await store.save();
        toast.success("Preset size removed");
      } catch (err) {
        console.error("Failed to delete preset size:", err);
        toast.error("Failed to delete preset size");
        // Revert on failure
        setPresetSizes(presetSizes);
      }
    },
    [presetSizes],
  );

  return {
    presetSizes,
    isLoading,
    addPresetSize,
    updatePresetSize,
    deletePresetSize,
  };
}
