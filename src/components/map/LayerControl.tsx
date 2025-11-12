import { Map, MapPin, Trees, Mountain, Users } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";

interface LayerControlProps {
  layers: {
    properties: boolean;
    huntingUnits: boolean;
    publicLand: boolean;
    friends: boolean;
  };
  onLayerToggle: (layer: string, enabled: boolean) => void;
}

export default function LayerControl({
  layers,
  onLayerToggle,
}: LayerControlProps) {
  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-2 shadow-lg">
            <Map className="h-4 w-4" />
            Layers
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Map Layers</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuCheckboxItem
            checked={layers.properties}
            onCheckedChange={(checked) =>
              onLayerToggle("properties", checked)
            }
          >
            <MapPin className="w-4 h-4 mr-2" />
            Property Boundaries
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={layers.huntingUnits}
            onCheckedChange={(checked) =>
              onLayerToggle("huntingUnits", checked)
            }
          >
            <Mountain className="w-4 h-4 mr-2" />
            WMAs & Hunting Units
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            checked={layers.friends}
            onCheckedChange={(checked) =>
              onLayerToggle("friends", checked)
            }
          >
            <Users className="w-4 h-4 mr-2" />
            Friends' Locations
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Property Colors
          </DropdownMenuLabel>
          <div className="px-2 py-1.5 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Public Property</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Private Property</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>State Property</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Federal Property</span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Hunting Unit Colors
          </DropdownMenuLabel>
          <div className="px-2 py-1.5 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-emerald-500 rounded"></div>
              <span>WMA</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-teal-500 rounded"></div>
              <span>State Park</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-emerald-700 rounded"></div>
              <span>National Forest</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
