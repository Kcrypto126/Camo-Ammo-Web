import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTripDialog({
  open,
  onOpenChange,
}: CreateTripDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [state, setState] = useState("");
  const [activityType, setActivityType] = useState("scouting");
  const [gameType, setGameType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [maxParticipants, setMaxParticipants] = useState("");

  const createTrip = useMutation(api.scoutingTrips.createTrip);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !locationName.trim() || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!lat || !lng) {
      toast.error("Please provide location coordinates");
      return;
    }

    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();

    if (endTimestamp < startTimestamp) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      await createTrip({
        title: title.trim(),
        description: description.trim() || undefined,
        locationName: locationName.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        state: state.trim() || undefined,
        activityType,
        gameType: gameType.trim() || undefined,
        startDate: startTimestamp,
        endDate: endTimestamp,
        privacy,
        maxParticipants: maxParticipants
          ? parseInt(maxParticipants)
          : undefined,
      });

      toast.success("Trip created successfully!");
      onOpenChange(false);
      resetForm();
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to create trip");
      }
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocationName("");
    setLat("");
    setLng("");
    setState("");
    setActivityType("scouting");
    setGameType("");
    setStartDate("");
    setEndDate("");
    setPrivacy("public");
    setMaxParticipants("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Scouting Trip</DialogTitle>
          <DialogDescription>
            Create a trip to find scouting partners in your area
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Trip Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Early Season Deer Scout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Looking for partners to scout public land before opening day..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activityType">
                Activity Type <span className="text-destructive">*</span>
              </Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scouting">Scouting</SelectItem>
                  <SelectItem value="hunting">Hunting</SelectItem>
                  <SelectItem value="camping">Camping</SelectItem>
                  <SelectItem value="hiking">Hiking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gameType">Game Type (optional)</Label>
              <Select value={gameType} onValueChange={setGameType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deer">Deer</SelectItem>
                  <SelectItem value="turkey">Turkey</SelectItem>
                  <SelectItem value="elk">Elk</SelectItem>
                  <SelectItem value="waterfowl">Waterfowl</SelectItem>
                  <SelectItem value="upland">Upland Birds</SelectItem>
                  <SelectItem value="bear">Bear</SelectItem>
                  <SelectItem value="small_game">Small Game</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationName">
              Location Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="locationName"
              placeholder="Mark Twain National Forest"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">
                Latitude <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lat"
                type="number"
                step="any"
                placeholder="38.5767"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lng">
                Longitude <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lng"
                type="number"
                step="any"
                placeholder="-92.1735"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="MO"
                value={state}
                onChange={(e) => setState(e.target.value)}
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
            <Input
              id="maxParticipants"
              type="number"
              min="2"
              placeholder="No limit"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Privacy</Label>
            <RadioGroup value={privacy} onValueChange={setPrivacy}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="font-normal cursor-pointer">
                  Public - Anyone can see and join
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="friends_only" id="friends_only" />
                <Label
                  htmlFor="friends_only"
                  className="font-normal cursor-pointer"
                >
                  Friends Only - Only friends can see and join
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label
                  htmlFor="private"
                  className="font-normal cursor-pointer"
                >
                  Private - Only you (for planning)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Trip
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
