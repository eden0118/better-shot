import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SaveSizeDialogProps {
  width: number;
  height: number;
  isOpen: boolean;
  onSave: (name: string) => void;
  onSkip: () => void;
  maxPresetsReached?: boolean;
}

export function SaveSizeDialog({
  width,
  height,
  isOpen,
  onSave,
  onSkip,
  maxPresetsReached = false,
}: SaveSizeDialogProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      onSave(name);
    } finally {
      setIsSaving(false);
      setName("");
    }
  }, [name, onSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-auto">
      <Card className="bg-card border-border max-w-sm w-full mx-4">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Save Screenshot Size?
            </h2>
            <p className="text-sm text-muted-foreground">
              Save this {width} × {height}px size for quick access next time.
            </p>
            {maxPresetsReached && (
              <p className="text-xs text-orange-400 mt-2">
                You've reached the 5 preset limit. Delete an existing preset to add a new one.
              </p>
            )}
          </div>

          {!maxPresetsReached && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Preset Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    handleSave();
                  }
                }}
                placeholder="e.g., Custom Web Size"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
              disabled={isSaving}
            >
              Skip
            </Button>
            {!maxPresetsReached && (
              <Button
                variant="cta"
                onClick={handleSave}
                disabled={!name.trim() || isSaving}
                className="flex-1"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
