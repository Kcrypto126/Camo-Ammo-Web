import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Binoculars,
  Plus,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Card } from "@/components/ui/card.tsx";
import CreateTripDialog from "./CreateTripDialog.tsx";
import TripDetailsDialog from "./TripDetailsDialog.tsx";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface ScoutingTripsPanelProps {
  onViewProfile?: (userId: Id<"users">) => void;
}

export default function ScoutingTripsPanel({ onViewProfile }: ScoutingTripsPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const myTrips = useQuery(api.scoutingTrips.getMyTrips);
  const availableTrips = useQuery(api.scoutingTrips.getAvailableTrips, {});
  const participatingTrips = useQuery(
    api.scoutingTrips.getMyParticipatingTrips
  );

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

  const TripCard = ({
    trip,
    showCreator = false,
  }: {
    trip: {
      _id: string;
      title: string;
      locationName: string;
      startDate: number;
      endDate: number;
      activityType: string;
      gameType?: string;
      participantCount: number;
      maxParticipants?: number;
      creatorName?: string;
      status: string;
    };
    showCreator?: boolean;
  }) => (
    <Card
      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => setSelectedTripId(trip._id)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{trip.title}</h3>
            {showCreator && trip.creatorName && (
              <p className="text-xs text-muted-foreground">
                by {trip.creatorName.split(" ")[0]}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`${getActivityBadgeColor(trip.activityType)} text-white`}
            >
              {trip.activityType}
            </Badge>
            {trip.status === "cancelled" && (
              <Badge variant="destructive">Cancelled</Badge>
            )}
          </div>
        </div>

        {trip.gameType && (
          <div className="text-sm text-muted-foreground">{trip.gameType}</div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{trip.locationName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(trip.startDate, "MMM d")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {trip.participantCount}
              {trip.maxParticipants && `/${trip.maxParticipants}`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm">
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Binoculars className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Scouting Trips</h2>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Trip
          </Button>
        </div>
      </div>

      <Tabs defaultValue="available" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="available" className="flex-1">
            Available
            {availableTrips && availableTrips.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {availableTrips.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-trips" className="flex-1">
            My Trips
            {myTrips && myTrips.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {myTrips.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="joined" className="flex-1">
            Joined
            {participatingTrips && participatingTrips.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {participatingTrips.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="available" className="p-4 pb-6 space-y-3">
            {!availableTrips ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading trips...
              </div>
            ) : availableTrips.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <Binoculars className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No available trips</p>
                <p className="text-xs mt-2">
                  Create your own trip to find scouting partners
                </p>
              </div>
            ) : (
              availableTrips.map((trip) => (
                <TripCard key={trip._id} trip={trip} showCreator />
              ))
            )}
          </TabsContent>

          <TabsContent value="my-trips" className="p-4 pb-6 space-y-3">
            {!myTrips ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading trips...
              </div>
            ) : myTrips.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <Binoculars className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No trips yet</p>
                <p className="text-xs mt-2">
                  Create a trip to find scouting partners
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Trip
                </Button>
              </div>
            ) : (
              myTrips.map((trip) => <TripCard key={trip._id} trip={trip} />)
            )}
          </TabsContent>

          <TabsContent value="joined" className="p-4 pb-6 space-y-3">
            {!participatingTrips ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading trips...
              </div>
            ) : participatingTrips.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <Binoculars className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No joined trips</p>
                <p className="text-xs mt-2">
                  Browse available trips to join others
                </p>
              </div>
            ) : (
              participatingTrips.map((trip) => (
                <TripCard key={trip._id} trip={trip} showCreator />
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <CreateTripDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {selectedTripId && (
        <TripDetailsDialog
          tripId={selectedTripId}
          open={!!selectedTripId}
          onOpenChange={(open) => !open && setSelectedTripId(null)}
        />
      )}
    </div>
  );
}
