import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Bell, Check, CheckCheck, AlertCircle, ThumbsUp, AlertTriangle, Truck, Footprints, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export function NotificationBell() {
  const notifications = useQuery(api.forums.getMyNotifications);
  const markAsRead = useMutation(api.forums.markNotificationRead);
  const updateVehicleStatus = useMutation(api.vehicleRecovery.updateRequestStatus);
  const closeVehicleRequest = useMutation(api.vehicleRecovery.closeRequest);
  const updateDeerStatus = useMutation(api.deerRecovery.updateRequestStatus);
  const closeDeerRequest = useMutation(api.deerRecovery.closeRequest);
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    try {
      await markAsRead({ notificationId });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleFollowUpAction = async (
    type: string,
    requestId: string,
    action: "still_waiting" | "in_progress" | "close"
  ) => {
    setProcessingId(requestId);
    try {
      if (action === "close") {
        if (type === "vehicle_recovery_followup") {
          await closeVehicleRequest({ requestId: requestId as Id<"vehicleRecoveryRequests"> });
        } else {
          await closeDeerRequest({ requestId: requestId as Id<"deerRecoveryRequests"> });
        }
        toast.success("Request closed successfully");
      } else {
        if (type === "vehicle_recovery_followup") {
          await updateVehicleStatus({ 
            requestId: requestId as Id<"vehicleRecoveryRequests">, 
            requestStatus: action 
          });
        } else {
          await updateDeerStatus({ 
            requestId: requestId as Id<"deerRecoveryRequests">, 
            requestStatus: action 
          });
        }
        toast.success("Status updated successfully");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "post_approved":
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case "post_rejected":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "forum_warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "vehicle_recovery_followup":
        return <Truck className="h-4 w-4 text-blue-500" />;
      case "deer_recovery_followup":
        return <Footprints className="h-4 w-4 text-amber-600" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications === undefined ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see updates about your posts here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const isFollowUp = notification.type === "vehicle_recovery_followup" || 
                                  notification.type === "deer_recovery_followup";
                return (
                  <div
                    key={notification._id}
                    className={`px-4 py-3 hover:bg-muted/50 transition-colors ${
                      !notification.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-1">
                            {notification.title}
                          </p>
                          {!notification.isRead && !isFollowUp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={() => handleMarkAsRead(notification._id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {isFollowUp && notification.relatedId && (
                          <div className="flex flex-col gap-1.5 mt-3">
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                disabled={processingId === notification.relatedId}
                                onClick={() => 
                                  handleFollowUpAction(notification.type, notification.relatedId!, "still_waiting")
                                }
                              >
                                {processingId === notification.relatedId ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Still Waiting"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                disabled={processingId === notification.relatedId}
                                onClick={() => 
                                  handleFollowUpAction(notification.type, notification.relatedId!, "in_progress")
                                }
                              >
                                {processingId === notification.relatedId ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "In Progress"
                                )}
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              className="w-full h-7 text-xs"
                              disabled={processingId === notification.relatedId}
                              onClick={() => 
                                handleFollowUpAction(notification.type, notification.relatedId!, "close")
                              }
                            >
                              {processingId === notification.relatedId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Close Request"
                              )}
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {notifications && notifications.length > 0 && (
          <div className="border-t px-4 py-2 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={async () => {
                // Mark all as read
                const unread = notifications.filter((n) => !n.isRead);
                for (const n of unread) {
                  await handleMarkAsRead(n._id);
                }
              }}
            >
              <CheckCheck className="h-3 w-3 mr-2" />
              Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
