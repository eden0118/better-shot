import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface FixedSize {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
}

// Common standard sizes grouped by category
const FIXED_SIZES: FixedSize[] = [
  // Desktop / Monitor
  {
    id: "1920x1080",
    name: "Full HD",
    width: 1920,
    height: 1080,
    category: "Desktop",
  },
  {
    id: "2560x1440",
    name: "QHD",
    width: 2560,
    height: 1440,
    category: "Desktop",
  },
  {
    id: "3840x2160",
    name: "4K",
    width: 3840,
    height: 2160,
    category: "Desktop",
  },
  { id: "1280x720", name: "HD", width: 1280, height: 720, category: "Desktop" },

  // Social Media
  {
    id: "1200x630",
    name: "Facebook",
    width: 1200,
    height: 630,
    category: "Social",
  },
  {
    id: "1200x627",
    name: "LinkedIn",
    width: 1200,
    height: 627,
    category: "Social",
  },
  {
    id: "1080x1080",
    name: "Instagram Square",
    width: 1080,
    height: 1080,
    category: "Social",
  },
  {
    id: "1080x1350",
    name: "Instagram Portrait",
    width: 1080,
    height: 1350,
    category: "Social",
  },
  {
    id: "1200x675",
    name: "Twitter",
    width: 1200,
    height: 675,
    category: "Social",
  },

  // Mobile
  {
    id: "750x1334",
    name: "iPhone 8/SE",
    width: 750,
    height: 1334,
    category: "Mobile",
  },
  {
    id: "1125x2436",
    name: "iPhone X/12/13",
    width: 1125,
    height: 2436,
    category: "Mobile",
  },
  {
    id: "1170x2532",
    name: "iPhone 14/15",
    width: 1170,
    height: 2532,
    category: "Mobile",
  },
  {
    id: "1440x3120",
    name: "Android (Samsung)",
    width: 1440,
    height: 3120,
    category: "Mobile",
  },

  // Tablet
  {
    id: "2048x1536",
    name: "iPad",
    width: 2048,
    height: 1536,
    category: "Tablet",
  },
  {
    id: "1024x768",
    name: "iPad Mini",
    width: 1024,
    height: 768,
    category: "Tablet",
  },

  // Video / Content
  {
    id: "1920x1080",
    name: "YouTube Thumbnail",
    width: 1280,
    height: 720,
    category: "Video",
  },
  {
    id: "3840x2160",
    name: "4K Video",
    width: 3840,
    height: 2160,
    category: "Video",
  },
  {
    id: "1280x1024",
    name: "SXGA",
    width: 1280,
    height: 1024,
    category: "Desktop",
  },
];

interface FixedSizesSelectorProps {
  onSelectSize: (size: FixedSize) => void;
  onCancel: () => void;
}

export function FixedSizesSelector({
  onSelectSize,
  onCancel,
}: FixedSizesSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Desktop", "Social"]),
  );
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const categories = Array.from(new Set(FIXED_SIZES.map((s) => s.category)));

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCustomSizeSubmit = () => {
    setCustomError(null);

    const width = parseInt(customWidth, 10);
    const height = parseInt(customHeight, 10);

    if (!customWidth.trim() || !customHeight.trim()) {
      setCustomError("Please enter both width and height");
      return;
    }

    if (isNaN(width) || isNaN(height)) {
      setCustomError("Width and height must be numbers");
      return;
    }

    if (width <= 0 || height <= 0) {
      setCustomError("Width and height must be greater than 0");
      return;
    }

    if (width > 10000 || height > 10000) {
      setCustomError("Width and height must be less than 10000");
      return;
    }

    const customSize: FixedSize = {
      id: `custom-${width}x${height}`,
      name: `Custom (${width}×${height})`,
      width,
      height,
      category: "Custom",
    };

    onSelectSize(customSize);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-auto">
      <Card className="bg-card border-border max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <CardContent className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Select Fixed Size
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose a preset size for your screenshot
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="size-5 text-muted-foreground" />
            </button>
          </div>

          {/* Custom Size Input */}
          <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border">
            <h3 className="text-sm font-medium text-foreground">Custom Size</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground block">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => {
                    setCustomWidth(e.target.value);
                    setCustomError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomSizeSubmit();
                    }
                  }}
                  placeholder="800"
                  min="1"
                  max="10000"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground block">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => {
                    setCustomHeight(e.target.value);
                    setCustomError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomSizeSubmit();
                    }
                  }}
                  placeholder="600"
                  min="1"
                  max="10000"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            {customError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                ⚠ {customError}
              </p>
            )}
            <Button
              variant="cta"
              onClick={handleCustomSizeSubmit}
              className="w-full"
              disabled={!customWidth.trim() || !customHeight.trim()}
            >
              Use Custom Size
            </Button>
          </div>

          {/* Preset Sizes */}
          <div className="space-y-3">
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category);
              const sizes = FIXED_SIZES.filter((s) => s.category === category);

              return (
                <div key={category} className="space-y-2">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                      {category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {sizes.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-2 gap-2 ml-2">
                      {sizes.map((size) => (
                        <button
                          key={size.id}
                          onClick={() => onSelectSize(size)}
                          className={cn(
                            "p-3 rounded-lg text-sm transition-all border",
                            "bg-secondary hover:bg-secondary/80 border-border",
                            "hover:shadow-md text-foreground",
                            "flex flex-col items-start gap-1 text-left",
                          )}
                          title={`${size.width} × ${size.height} px`}
                        >
                          <span className="font-medium">{size.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {size.width} × {size.height}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>

        <div className="border-t border-border p-4 flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
