import { useState, useCallback, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RegionSizeSelection {
  mode: "free" | "fixed";
  width?: number;
  height?: number;
  aspectRatio?: string;
}

interface RegionSizeSelectorProps {
  onSelect: (selection: RegionSizeSelection) => void;
  onCancel: () => void;
}

const ASPECT_RATIOS = [
  { label: "Free", value: undefined },
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "1:1", value: "1:1" },
  { label: "9:16", value: "9:16" },
];

const PRESET_SIZES = [
  { label: "1920 × 1080 (Full HD)", width: 1920, height: 1080 },
  { label: "1280 × 720 (HD)", width: 1280, height: 720 },
  { label: "1024 × 768", width: 1024, height: 768 },
  { label: "800 × 600", width: 800, height: 600 },
  { label: "1080 × 1080 (Square)", width: 1080, height: 1080 },
];

export function RegionSizeSelector({
  onSelect,
  onCancel,
}: RegionSizeSelectorProps) {
  const [mode, setMode] = useState<"free" | "fixed">("free");
  const [width, setWidth] = useState<string>("1920");
  const [height, setHeight] = useState<string>("1080");
  const [aspectRatio, setAspectRatio] = useState<string | undefined>("16:9");

  const handleSelect = useCallback(() => {
    if (mode === "free") {
      onSelect({ mode: "free" });
    } else {
      const w = parseInt(width, 10);
      const h = parseInt(height, 10);
      if (w > 0 && h > 0) {
        onSelect({
          mode: "fixed",
          width: w,
          height: h,
          aspectRatio,
        });
      }
    }
  }, [mode, width, height, aspectRatio, onSelect]);

  const handlePresetSelect = (w: number, h: number) => {
    setWidth(w.toString());
    setHeight(h.toString());
    setMode("fixed");
  };

  const handleAspectRatioChange = (ratio: string | undefined) => {
    setAspectRatio(ratio);
    if (ratio === undefined) {
      setMode("free");
    } else {
      setMode("fixed");
      // Calculate height based on width and aspect ratio
      const w = parseInt(width, 10);
      if (ratio === "16:9") {
        setHeight(Math.round((w * 9) / 16).toString());
      } else if (ratio === "4:3") {
        setHeight(Math.round((w * 3) / 4).toString());
      } else if (ratio === "1:1") {
        setHeight(w.toString());
      } else if (ratio === "9:16") {
        setHeight(Math.round((w * 16) / 9).toString());
      }
    }
  };

  const handleWidthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newWidth = e.target.value;
    setWidth(newWidth);

    // Auto-adjust height if aspect ratio is locked
    if (aspectRatio) {
      const w = parseInt(newWidth, 10);
      if (w > 0) {
        if (aspectRatio === "16:9") {
          setHeight(Math.round((w * 9) / 16).toString());
        } else if (aspectRatio === "4:3") {
          setHeight(Math.round((w * 3) / 4).toString());
        } else if (aspectRatio === "1:1") {
          setHeight(w.toString());
        } else if (aspectRatio === "9:16") {
          setHeight(Math.round((w * 16) / 9).toString());
        }
      }
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800 shadow-lg">
      <div className="max-w-full px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        {/* Mode Selection */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={mode === "free" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("free");
              setAspectRatio(undefined);
            }}
          >
            Free Select
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* Aspect Ratio Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {aspectRatio || "Aspect Ratio"}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Aspect Ratio</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ASPECT_RATIOS.map((ratio) => (
                <DropdownMenuItem
                  key={ratio.value || "free"}
                  onClick={() => handleAspectRatioChange(ratio.value)}
                  className={cn(
                    aspectRatio === ratio.value && "bg-accent",
                  )}
                >
                  {ratio.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Size Inputs */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Width"
            value={width}
            onChange={handleWidthChange}
            disabled={mode === "free"}
            className="w-20"
            min="1"
          />
          <span className="text-sm text-muted-foreground">×</span>
          <Input
            type="number"
            placeholder="Height"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            disabled={mode === "free"}
            className="w-20"
            min="1"
          />
        </div>

        {/* Preset Sizes Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Presets
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Common Sizes</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRESET_SIZES.map((preset) => (
              <DropdownMenuItem
                key={`${preset.width}x${preset.height}`}
                onClick={() => handlePresetSelect(preset.width, preset.height)}
              >
                <div className="flex flex-col">
                  <span>{preset.label}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="default"
            size="sm"
            onClick={handleSelect}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Capture
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="size-9"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
