import { usePresetSizes, type PresetSize } from "@/hooks/usePresetSizes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";

export function PresetSizesManager() {
  const {
    presetSizes,
    isLoading,
    addPresetSize,
    updatePresetSize,
    deletePresetSize,
  } = usePresetSizes();

  const [nameInput, setNameInput] = useState("");
  const [widthInput, setWidthInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingWidth, setEditingWidth] = useState("");
  const [editingHeight, setEditingHeight] = useState("");

  const handleAddPreset = () => {
    if (nameInput && widthInput && heightInput) {
      addPresetSize(nameInput, parseInt(widthInput), parseInt(heightInput));
      setNameInput("");
      setWidthInput("");
      setHeightInput("");
    }
  };

  const handleUpdatePreset = (id: string) => {
    if (editingName && editingWidth && editingHeight) {
      updatePresetSize(
        id,
        editingName,
        parseInt(editingWidth),
        parseInt(editingHeight),
      );
      setEditingId(null);
      setEditingName("");
      setEditingWidth("");
      setEditingHeight("");
    }
  };

  const startEditing = (preset: PresetSize) => {
    setEditingId(preset.id);
    setEditingName(preset.name);
    setEditingWidth(preset.width.toString());
    setEditingHeight(preset.height.toString());
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preset Screenshot Sizes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Loading preset sizes...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preset Screenshot Sizes</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Create and manage frequently used screenshot dimensions for quick
          access
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Preset Section */}
        <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border">
          <h3 className="text-sm font-medium">Add New Preset</h3>
          <div className="grid grid-cols-1 gap-3">
            <input
              placeholder="Name (e.g., MacBook Pro 14)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  nameInput &&
                  widthInput &&
                  heightInput
                ) {
                  handleAddPreset();
                }
              }}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Width (px)"
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                min="1"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <input
                type="number"
                placeholder="Height (px)"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                min="1"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddPreset}
              disabled={!nameInput || !widthInput || !heightInput}
              className="w-full"
            >
              <Plus className="size-4 mr-2" />
              Add Preset
            </Button>
          </div>
        </div>

        {/* Existing Presets Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Your Presets</h3>
          {presetSizes.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border border-border text-center">
              No preset sizes yet. Add one above to get started!
            </div>
          ) : (
            <div className="space-y-2">
              {presetSizes.map((preset) =>
                editingId === preset.id ? (
                  // Edit Mode
                  <div
                    key={preset.id}
                    className="p-3 bg-secondary/50 rounded-lg border border-border space-y-2"
                  >
                    <input
                      placeholder="Name"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Width"
                        value={editingWidth}
                        onChange={(e) => setEditingWidth(e.target.value)}
                        min="1"
                        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                      />
                      <input
                        type="number"
                        placeholder="Height"
                        value={editingHeight}
                        onChange={(e) => setEditingHeight(e.target.value)}
                        min="1"
                        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => handleUpdatePreset(preset.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                          setEditingWidth("");
                          setEditingHeight("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors group"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.width} × {preset.height} px
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(preset)}
                        className="h-8 px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePresetSize(preset.id)}
                        className="h-8 px-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* Quick Reference */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border">
          <p className="font-medium mb-1">Suggested presets:</p>
          <ul className="space-y-1">
            <li>• MacBook Pro 14": 1512 × 982 px</li>
            <li>• MacBook Pro 16": 1728 × 1117 px</li>
            <li>• Square: 600 × 600 px</li>
            <li>• Social Media (1:1): 1080 × 1080 px</li>
            <li>• Mobile: 390 × 844 px</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
