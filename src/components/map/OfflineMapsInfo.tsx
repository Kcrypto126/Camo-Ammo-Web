import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Info, Download, Wifi, WifiOff, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";

interface OfflineMapsInfoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OfflineMapsInfo({
  open,
  onOpenChange,
}: OfflineMapsInfoProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Offline Maps & GPS</DialogTitle>
          <DialogDescription>
            How to use HuntPro when you don't have cell service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your GPS location works without cell service! However, map tiles
              require an internet connection to download initially.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Before Going Offline
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                <strong>View your hunting area</strong> - Pan and zoom around
                the exact areas you plan to hunt while connected to WiFi or cell
                service
              </li>
              <li>
                <strong>Load all map layers</strong> - Toggle on Property
                Boundaries and WMA layers to cache those areas
              </li>
              <li>
                <strong>Browse at different zoom levels</strong> - Zoom in and
                out to cache tiles at various detail levels
              </li>
              <li>
                <strong>Switch basemaps</strong> - View Satellite, Topo, and
                Hybrid views to cache all map types you might need
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              What Works Offline
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <div>
                  <strong>GPS Location:</strong> Your device's GPS works without
                  cell service or WiFi
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <div>
                  <strong>Track Recording:</strong> Record your trail and save
                  waypoints offline (syncs when you reconnect)
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <div>
                  <strong>Cached Map Tiles:</strong> Previously viewed areas remain
                  visible thanks to browser caching
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Download className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600" />
                <div>
                  <strong>Compass:</strong> Use your device's compass to orient
                  yourself (three-finger tap on location button)
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">
              LIMITATIONS
            </h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                • Map tiles not previously viewed will not be available offline
              </li>
              <li>• Weather forecasts require an internet connection</li>
              <li>
                • Property and WMA data updates require an internet connection
              </li>
              <li>
                • Browser cache may clear tiles after 7-30 days of inactivity
              </li>
            </ul>
          </div>

          <div className="bg-muted p-4 rounded-lg text-sm">
            <p className="font-semibold mb-2">💡 Pro Tip</p>
            <p>
              The day before your hunt, open the app and thoroughly explore your
              hunting area at multiple zoom levels. This ensures the maximum
              number of map tiles are cached for offline use.
            </p>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Got It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
