import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  ChevronLeft,
  Plus,
  MapPin,
  Phone,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  Truck,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from "@/lib/google-maps.ts";

interface VehicleRecoveryPageProps {
  onBack: () => void;
}

export default function VehicleRecoveryPage({ onBack }: VehicleRecoveryPageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"vehicleRecoveryRequests"> | null>(
    null
  );
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const requests = useQuery(
    api.vehicleRecovery.getRequests,
    userLocation
      ? {
          userLat: userLocation.lat,
          userLng: userLocation.lng,
          maxDistance: 50,
        }
      : {}
  );

  if (selectedRequestId) {
    return (
      <RequestDetailView
        requestId={selectedRequestId}
        onBack={() => setSelectedRequestId(null)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Vehicle Recovery</h1>
            <p className="text-xs text-muted-foreground">
              Get help from nearby hunters
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request Help
          </Button>
        </div>
      </div>

      {/* Active Requests List */}
      <div className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Active Requests</h2>
        {!requests ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 font-semibold">No active requests</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Need help? Create a recovery request.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Request Help
              </Button>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card
              key={request._id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => setSelectedRequestId(request._id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {request.user?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold leading-tight">
                        {request.serviceNeeded}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{request.user?.name || "Unknown"}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(request.createdAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {request.distance !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {request.distance.toFixed(1)} mi
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {request.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {request.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{request.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{request.commentCount}</span>
                  </div>
                  {request.locationName && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{request.locationName}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ticket History */}
      <RequestHistorySection onSelectRequest={setSelectedRequestId} />

      {/* Create Request Dialog */}
      <CreateRequestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        userLocation={userLocation}
      />
    </div>
  );
}

// Request History Section Component
function RequestHistorySection({
  onSelectRequest,
}: {
  onSelectRequest: (requestId: Id<"vehicleRecoveryRequests">) => void;
}) {
  const history = useQuery(api.vehicleRecovery.getRequestHistory);
  const currentUser = useQuery(api.users.getCurrentUser);
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner";

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 p-4 pb-6 border-t">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {isAdmin ? "Ticket History" : "Recent Closed Tickets"}
      </h2>
      <p className="text-xs text-muted-foreground -mt-2">
        {isAdmin 
          ? "View and reopen closed tickets" 
          : "Visible for 10 minutes after closing"}
      </p>
      {history.map((request) => (
        <Card
          key={request._id}
          className="cursor-pointer transition-all hover:shadow-md opacity-75"
          onClick={() => onSelectRequest(request._id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold leading-tight">
                  {request.serviceNeeded}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Closed</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(request.closedAt || request.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Resolved
              </Badge>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

// Request Detail View Component
function RequestDetailView({
  requestId,
  onBack,
}: {
  requestId: Id<"vehicleRecoveryRequests">;
  onBack: () => void;
}) {
  const [commentText, setCommentText] = useState("");
  const request = useQuery(api.vehicleRecovery.getRequest, { requestId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const addComment = useMutation(api.vehicleRecovery.addComment);
  const updateStatus = useMutation(api.vehicleRecovery.updateStatus);
  const closeRequest = useMutation(api.vehicleRecovery.closeRequest);
  const reopenRequest = useMutation(api.vehicleRecovery.reopenRequest);

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner";
  const isOwner = request?.userId === currentUser?._id;
  const isClosed = request?.closedAt !== undefined;

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      await addComment({
        requestId,
        content: commentText,
      });
      setCommentText("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleResolve = async () => {
    try {
      await updateStatus({ requestId, status: "resolved" });
      toast.success("Request marked as resolved");
      onBack();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleClose = async () => {
    try {
      await closeRequest({ requestId });
      toast.success("Request closed successfully");
      onBack();
    } catch (error) {
      toast.error("Failed to close request");
    }
  };

  const handleReopen = async () => {
    try {
      await reopenRequest({ requestId });
      toast.success("Request reopened successfully");
    } catch (error) {
      toast.error("Failed to reopen request");
    }
  };

  if (!request) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            {isOwner && !isClosed && (
              <Button
                variant="default"
                size="sm"
                onClick={handleClose}
                className="bg-green-500 hover:bg-green-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Close Request
              </Button>
            )}
            {isAdmin && isClosed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopen}
              >
                Reopen Request
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4 pb-4">
          {/* Request */}
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {request.user?.name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{request.user?.name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <h1 className="text-xl font-bold">{request.serviceNeeded}</h1>
              <div className="flex gap-2">
                <Badge
                  variant={request.status === "active" ? "default" : "secondary"}
                  className="w-fit"
                >
                  {isClosed ? "Closed" : request.status}
                </Badge>
                {request.requestStatus && !isClosed && (
                  <Badge variant="outline" className="w-fit">
                    {request.requestStatus === "still_waiting" ? "Still Waiting" : "In Progress"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {request.description && (
                <p className="mb-4 whitespace-pre-wrap text-sm">{request.description}</p>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${request.phoneNumber}`} className="text-primary underline">
                    {request.phoneNumber}
                  </a>
                </div>
                {request.locationName && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{request.locationName}</span>
                  </div>
                )}
              </div>
              {request.photos && request.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {request.photos.map((photo, index) => (
                    <PhotoDisplay key={index} storageId={photo} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="font-semibold">Comments ({request.commentCount})</h3>
            {request.comments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No comments yet. Be the first to help!
                  </p>
                </CardContent>
              </Card>
            ) : (
              request.comments.map((comment) => (
                <Card key={comment._id}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {comment.user?.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">
                        {comment.user?.name || "Unknown"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(comment.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Comment Input */}
      {request.status === "active" && (
        <div className="flex-none border-t bg-background p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <Button onClick={handleAddComment} disabled={!commentText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Create Request Dialog Component
function CreateRequestDialog({
  open,
  onOpenChange,
  userLocation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const profile = useQuery(api.profile.getMyProfile, {});
  const [serviceNeeded, setServiceNeeded] = useState("");
  const [description, setDescription] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    userLocation
  );
  const [locationName, setLocationName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createRequest = useMutation(api.vehicleRecovery.createRequest);
  const generateUploadUrl = useMutation(api.vehicleRecovery.generateUploadUrl);

  useEffect(() => {
    if (userLocation && !location) {
      setLocation(userLocation);
    }
  }, [userLocation, location]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit to 4 photos
    if (photos.length + files.length > 4) {
      toast.error("Maximum 4 photos allowed");
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          return null;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          return null;
        }

        // Get upload URL
        const uploadUrl = await generateUploadUrl({});

        // Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await result.json();
        return storageId as string;
      });

      const storageIds = await Promise.all(uploadPromises);
      const validIds = storageIds.filter((id): id is string => id !== null);
      
      setPhotos((prev) => [...prev, ...validIds]);
      toast.success(`${validIds.length} photo(s) uploaded`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photos");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!serviceNeeded.trim() || !phoneNumber.trim() || !location) {
      toast.error("Please fill in all required fields and set your location");
      return;
    }

    try {
      setIsSubmitting(true);
      await createRequest({
        serviceNeeded,
        description,
        phoneNumber,
        lat: location.lat,
        lng: location.lng,
        locationName,
        photos: photos.length > 0 ? photos : undefined,
      });
      toast.success("Request created! Nearby hunters will be notified.");
      setServiceNeeded("");
      setDescription("");
      setPhoneNumber("");
      setLocationName("");
      setPhotos([]);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Vehicle Recovery</DialogTitle>
          <DialogDescription>
            Get help from nearby hunters within 50 miles
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Your Name</Label>
            <Input
              value={profile?.name || "Loading..."}
              disabled
              className="bg-muted"
            />
            {profile?.memberNumber && (
              <Badge variant="outline" className="text-xs text-yellow-500">
                {profile.memberNumber}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="service">Service Needed *</Label>
            <Input
              id="service"
              placeholder="e.g., Tow, Tire Change, Jump Start"
              value={serviceNeeded}
              onChange={(e) => setServiceNeeded(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="555-123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide details about your situation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationName">Location Name</Label>
            <Input
              id="locationName"
              placeholder="e.g., Highway 54, near Johnson Creek"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Photos (Optional)</Label>
            <div className="space-y-3">
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((storageId, index) => (
                    <div key={index} className="relative">
                      <PhotoDisplay storageId={storageId} />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || photos.length >= 4}
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photos ({photos.length}/4)
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload up to 4 photos (max 5MB each)
            </p>
          </div>
          <div className="space-y-2">
            <Label>Location on Map *</Label>
            {isLoaded && location ? (
              <div className="h-48 overflow-hidden rounded-lg border">
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={location}
                  zoom={13}
                  onClick={(e) => {
                    if (e.latLng) {
                      setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                    }
                  }}
                >
                  <Marker position={location} />
                </GoogleMap>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border bg-muted">
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Click on the map to set your exact location
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isUploading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
            {isSubmitting ? "Creating..." : "Request Help"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Photo Display Component
function PhotoDisplay({ storageId }: { storageId: string }) {
  const photoUrl = useQuery(api.vehicleRecovery.getPhotoUrl, { storageId });

  if (!photoUrl) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-lg border bg-muted">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt="Photo"
      className="h-32 w-full rounded-lg border object-cover"
    />
  );
}
