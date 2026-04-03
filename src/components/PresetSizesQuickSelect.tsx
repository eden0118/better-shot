import { usePresetSizes } from "@/hooks/usePresetSizes";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PresetSizesQuickSelectProps {
  onSelectSize?: (width: number, height: number, name: string) => void;
}

export function PresetSizesQuickSelect({ onSelectSize }: PresetSizesQuickSelectProps) {
  const { presetSizes, isLoading } = usePresetSizes();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading || presetSizes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-colors text-sm font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          Quick Preset Sizes
        </span>
        <span className="text-xs text-muted-foreground">{presetSizes.length} saved</span>
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-2 p-2 bg-secondary/20 rounded-lg border border-border/50">
          {presetSizes.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onSelectSize?.(preset.width, preset.height, preset.name);
                setIsExpanded(false);
              }}
              className={cn(
                "p-2 rounded text-sm transition-all",
                "bg-secondary hover:bg-secondary/80 border border-border",
                "text-foreground hover:shadow-md",
                "flex flex-col items-start gap-1"
              )}
              title={`${preset.width} × ${preset.height} px`}
            >
              <span className="font-medium truncate w-full">{preset.name}</span>
              <span className="text-xs text-muted-foreground">
                {preset.width} × {preset.height}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
