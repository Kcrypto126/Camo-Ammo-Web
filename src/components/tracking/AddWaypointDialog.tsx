import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";

interface AddWaypointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lng: number;
  altitude?: number;
}

const waypointTypes = [
  { value: "stand", label: "Tree Stand" },
  { value: "blind", label: "Blind" },
  { value: "camera", label: "Trail Camera" },
  { value: "marker", label: "Marker" },
  { value: "parking", label: "Parking" },
  { value: "camp", label: "Camp" },
];

export default function AddWaypointDialog({
  open,
  onOpenChange,
  lat,
  lng,
  altitude,
}: AddWaypointDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("marker");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createWaypoint = useMutation(api.waypoints.createWaypoint);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setIsSubmitting(true);
    try {
      await createWaypoint({
        name: name.trim(),
        description: description.trim() || undefined,
        lat,
        lng,
        altitude,
        type,
      });

      toast.success("Waypoint added");
      onOpenChange(false);
      setName("");
      setDescription("");
      setType("marker");
    } catch (error) {
      toast.error("Failed to add waypoint");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Waypoint</DialogTitle>
          <DialogDescription>
            Mark this location for future reference
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Big Oak Tree Stand"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {waypointTypes.map((wType) => (
                  <SelectItem key={wType.value} value={wType.value}>
                    {wType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this location..."
              rows={3}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
            {altitude && <p>Altitude: {Math.round(altitude * 3.28084)} ft</p>}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Waypoint"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
