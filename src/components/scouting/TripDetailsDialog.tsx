import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Calendar,
  MapPin,
  Users,
  UserPlus,
  UserMinus,
  Clock,
  Lock,
  Globe,
  UsersIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format } from "date-fns";

interface TripDetailsDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TripDetailsDialog({
  tripId,
  open,
  onOpenChange,
}: TripDetailsDialogProps) {
  const tripDetails = useQuery(
    api.scoutingTrips.getTripDetails,
    tripId ? { tripId: tripId as never } : "skip"
  );
  const joinTrip = useMutation(api.scoutingTrips.joinTrip);
  const leaveTrip = useMutation(api.scoutingTrips.leaveTrip);
  const cancelTrip = useMutation(api.scoutingTrips.cancelTrip);

  const handleJoin = async () => {
    try {
      await joinTrip({ tripId: tripId as never });
      toast.success("Successfully joined trip!");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to join trip");
      }
    }
  };

  const handleLeave = async () => {
    try {
      await leaveTrip({ tripId: tripId as never });
      toast.success("Left trip");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to leave trip");
      }
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this trip?")) {
      return;
    }

    try {
      await cancelTrip({ tripId: tripId as never });
      toast.success("Trip cancelled");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to cancel trip");
      }
    }
  };

  const getActivityBadgeColor = (activityType: string) => {
    switch (activityType) {
      case "scouting":
        return "bg-blue-500";
      case "hunting":
        return "bg-red-500";
      case "camping":
        return "bg-green-500";
      case "hiking":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "friends_only":
        return <UsersIcon className="h-4 w-4" />;
      case "private":
        return <Lock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (!tripDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8">Loading trip details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const isCreator = tripDetails.userRole === "creator";
  const isFull =
    tripDetails.maxParticipants &&
    tripDetails.participants.length >= tripDetails.maxParticipants;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <DialogTitle className="text-xl">{tripDetails.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  className={`${getActivityBadgeColor(tripDetails.activityType)} text-white`}
                >
                  {tripDetails.activityType}
                </Badge>
                {tripDetails.gameType && (
                  <Badge variant="outline">{tripDetails.gameType}</Badge>
                )}
                {tripDetails.status === "cancelled" && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {getPrivacyIcon(tripDetails.privacy)}
                  <span className="capitalize">
                    {tripDetails.privacy.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          {tripDetails.description && (
            <div>
              <p className="text-sm text-muted-foreground">
                {tripDetails.description}
              </p>
            </div>
          )}

          {/* Key Details */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Dates</div>
                  <div className="font-medium">
                    {format(tripDetails.startDate, "MMM d")} -{" "}
                    {format(tripDetails.endDate, "MMM d, yyyy")}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="font-medium truncate">
                    {tripDetails.locationName}
                  </div>
                  {tripDetails.state && (
                    <div className="text-xs text-muted-foreground">
                      {tripDetails.state}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Separator />

          {/* Organizer */}
          <div>
            <div className="text-sm font-semibold mb-2">Organized by</div>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="font-medium">{tripDetails.creatorName?.split(" ")[0]}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Participants */}
          <div>
            <div className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({tripDetails.participants.length}
              {tripDetails.maxParticipants && `/${tripDetails.maxParticipants}`}
              )
            </div>
            <div className="space-y-2">
              {tripDetails.participants.map((participant) => (
                <Card key={participant._id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{participant.name?.split(" ")[0]}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {participant.role === "creator" && (
                          <Badge variant="secondary" className="text-xs">
                            Organizer
                          </Badge>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Joined {format(participant.joinedAt, "MMM d")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {tripDetails.status === "upcoming" && (
              <>
                {!tripDetails.isParticipant && !isFull && (
                  <Button onClick={handleJoin} className="flex-1">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Trip
                  </Button>
                )}

                {!tripDetails.isParticipant && isFull && (
                  <Button disabled className="flex-1">
                    Trip Full
                  </Button>
                )}

                {tripDetails.isParticipant && !isCreator && (
                  <Button
                    variant="outline"
                    onClick={handleLeave}
                    className="flex-1"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Leave Trip
                  </Button>
                )}

                {isCreator && (
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Trip
                  </Button>
                )}
              </>
            )}

            {tripDetails.status === "cancelled" && (
              <div className="w-full text-center text-sm text-muted-foreground py-4">
                This trip has been cancelled
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
