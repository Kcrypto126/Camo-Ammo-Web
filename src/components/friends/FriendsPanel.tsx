import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Users,
  UserPlus,
  X,
  Check,
  UserMinus,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import AddFriendDialog from "./AddFriendDialog.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface FriendsPanelProps {
  onViewProfile?: (userId: Id<"users">) => void;
}

export default function FriendsPanel({ onViewProfile }: FriendsPanelProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const friends = useQuery(api.friends.getFriends);
  const pendingRequests = useQuery(api.friends.getPendingRequests);
  const friendsLocations = useQuery(api.locationSharing.getFriendsLocations);

  const sendRequest = useMutation(api.friends.sendFriendRequest);
  const acceptRequest = useMutation(api.friends.acceptFriendRequest);
  const rejectRequest = useMutation(api.friends.rejectFriendRequest);
  const removeFriend = useMutation(api.friends.removeFriend);

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest({ requestId: requestId as never });
      toast.success("Friend request accepted!");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message: errorMessage } = error.data as {
          code: string;
          message: string;
        };
        toast.error(errorMessage);
      } else {
        toast.error("Failed to accept request");
      }
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectRequest({ requestId: requestId as never });
      toast.success("Friend request rejected");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message: errorMessage } = error.data as {
          code: string;
          message: string;
        };
        toast.error(errorMessage);
      } else {
        toast.error("Failed to reject request");
      }
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await removeFriend({ friendId: friendId as never });
      toast.success("Friend removed");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message: errorMessage } = error.data as {
          code: string;
          message: string;
        };
        toast.error(errorMessage);
      } else {
        toast.error("Failed to remove friend");
      }
    }
  };

  const getFriendLocation = (friendId: string) => {
    return friendsLocations?.find((loc) => loc.userId === friendId);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Friends</h2>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      <Tabs defaultValue="friends" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="friends" className="flex-1">
            Friends
            {friends && friends.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {friends.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1">
            Requests
            {pendingRequests && pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="friends" className="p-4 pb-6 space-y-3">
            {!friends ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading friends...
              </div>
            ) : friends.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <p>No friends yet</p>
                <p className="text-xs mt-2">
                  Add friends to share locations and plan hunts together
                </p>
              </div>
            ) : (
              friends.map((friend) => {
                const location = getFriendLocation(friend._id);
                return (
                  <Card key={friend._id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium truncate ${onViewProfile ? "cursor-pointer hover:text-primary" : ""}`}
                          onClick={() => onViewProfile?.(friend._id as Id<"users">)}
                        >
                          {friend.name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {friend.email}
                        </div>
                        {location && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <MapPin className="h-3 w-3" />
                            <span>Sharing location</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFriend(friend._id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="requests" className="p-4 pb-6 space-y-3">
            {!pendingRequests ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading requests...
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No pending requests
              </div>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request._id} className="p-3">
                  <div className="space-y-3">
                    <div>
                      <div
                        className={`font-medium ${onViewProfile && request.fromUser?._id ? "cursor-pointer hover:text-primary" : ""}`}
                        onClick={() => request.fromUser?._id && onViewProfile?.(request.fromUser._id as Id<"users">)}
                      >
                        {request.fromUser?.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {request.fromUser?.email}
                      </div>
                      {request.message && (
                        <div className="text-sm mt-2 p-2 bg-muted rounded">
                          {request.message}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(request._id)}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request._id)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <AddFriendDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
