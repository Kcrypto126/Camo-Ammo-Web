import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
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
  Target,
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

interface DeerRecoveryPageProps {
  onBack: () => void;
}

export default function DeerRecoveryPage({ onBack }: DeerRecoveryPageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"deerRecoveryRequests"> | null>(
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
    api.deerRecovery.getRequests,
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
            <h1 className="text-lg font-bold">Deer Recovery</h1>
            <p className="text-xs text-muted-foreground">
              Need Help Recovering A Deer
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
              <Target className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 font-semibold">No active requests</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Need help recovering a deer? Create a request.
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
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {request.user?.name || "Unknown Hunter"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(request.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  {request.distance && (
                    <Badge variant="secondary" className="text-xs">
                      {request.distance.toFixed(1)} mi
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm line-clamp-2">{request.notes}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {request.locationName || "Location shared"}
                    </span>
                  </div>
                  {request.shotPlacement && (
                    <Badge variant="outline" className="text-xs">
                      {request.shotPlacement === "quartered_away" && "Quartered Away"}
                      {request.shotPlacement === "quartering_to" && "Quartering To"}
                      {request.shotPlacement === "broadside" && "Broadside"}
                    </Badge>
                  )}
                  {request.yardsFromHit && (
                    <Badge variant="outline" className="text-xs">
                      {request.yardsFromHit} from hit
                    </Badge>
                  )}
                  {request.commentCount > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{request.commentCount}</span>
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
      {showCreateDialog && (
        <CreateRequestDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}

// Request History Section Component
function RequestHistorySection({
  onSelectRequest,
}: {
  onSelectRequest: (requestId: Id<"deerRecoveryRequests">) => void;
}) {
  const history = useQuery(api.deerRecovery.getRequestHistory);
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
                  Deer Recovery Request
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

function CreateRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useQuery(api.profile.getMyProfile, {});
  const createRequest = useMutation(api.deerRecovery.createRequest);
  const generateUploadUrl = useMutation(api.deerRecovery.generateUploadUrl);

  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [shotPlacement, setShotPlacement] = useState<string>("");
  const [yardsFromHit, setYardsFromHit] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES as never,
  });

  // Set phone number from profile when loaded
  useEffect(() => {
    if (profile?.phoneNumber) {
      setPhoneNumber(profile.phoneNumber);
    }
  }, [profile]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation && !location) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Florida center if location unavailable
          setLocation({ lat: 28.5, lng: -82.5 });
        }
      );
    }
  }, [location]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setLocation({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    if (selectedPhotos.length + validFiles.length > 4) {
      toast.error("You can only upload up to 4 photos");
      return;
    }

    setSelectedPhotos((prev) => [...prev, ...validFiles]);
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notes.trim()) {
      toast.error("Please describe what help you need");
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error("Please provide a phone number");
      return;
    }

    if (!location) {
      toast.error("Please select a location on the map");
      return;
    }

    try {
      setUploading(true);

      // Upload photos if any
      const photoIds: string[] = [];
      for (const photo of selectedPhotos) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": photo.type },
          body: photo,
        });
        const { storageId } = await result.json();
        photoIds.push(storageId);
      }

      await createRequest({
        notes: notes.trim(),
        phoneNumber: phoneNumber.trim(),
        lat: location.lat,
        lng: location.lng,
        locationName: locationName.trim() || undefined,
        shotPlacement: shotPlacement || undefined,
        yardsFromHit: yardsFromHit.trim() || undefined,
        photos: photoIds.length > 0 ? photoIds : undefined,
      });

      toast.success("Recovery request created successfully");
      onClose();
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Failed to create request. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Deer Recovery Help</DialogTitle>
          <DialogDescription>
            Request help from nearby hunters to recover your deer
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (auto-filled from profile) */}
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

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">What do you need help with? *</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the situation and what assistance you need..."
              rows={4}
              required
            />
          </div>

          {/* Shot Placement */}
          <div className="space-y-2">
            <Label>Shot Placement</Label>
            <RadioGroup value={shotPlacement} onValueChange={setShotPlacement}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quartered_away" id="quartered_away" />
                <Label htmlFor="quartered_away" className="cursor-pointer font-normal">
                  Quartered Away
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quartering_to" id="quartering_to" />
                <Label htmlFor="quartering_to" className="cursor-pointer font-normal">
                  Quartering To
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="broadside" id="broadside" />
                <Label htmlFor="broadside" className="cursor-pointer font-normal">
                  Broadside
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Yards From Hit */}
          <div className="space-y-2">
            <Label htmlFor="yards">
              How many yards walked from the hit site?
            </Label>
            <Input
              id="yards"
              value={yardsFromHit}
              onChange={(e) => setYardsFromHit(e.target.value)}
              placeholder="e.g., 50 yards"
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos of Blood Trail</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <div className="space-y-2">
              {selectedPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedPhotos.map((photo, index) => (
                    <div key={index} className="group relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="h-24 w-full rounded-md object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute right-1 top-1 rounded-full bg-destructive p-1 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3 text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedPhotos.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photos ({selectedPhotos.length}/4)
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Upload up to 4 photos (max 5MB each)
              </p>
            </div>
          </div>

          {/* Location Picker */}
          <div className="space-y-2">
            <Label>Drop a Pin for Location *</Label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Location name (optional)"
            />
            {isLoaded && location && (
              <div className="h-64 overflow-hidden rounded-md border">
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={location}
                  zoom={12}
                  onClick={handleMapClick}
                  options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                  }}
                >
                  <Marker position={location} />
                </GoogleMap>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Click on the map to set your location
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Creating..." : "Request Help"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestDetailView({
  requestId,
  onBack,
}: {
  requestId: Id<"deerRecoveryRequests">;
  onBack: () => void;
}) {
  const request = useQuery(api.deerRecovery.getRequest, { requestId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const addComment = useMutation(api.deerRecovery.addComment);
  const updateStatus = useMutation(api.deerRecovery.updateStatus);
  const closeRequest = useMutation(api.deerRecovery.closeRequest);
  const reopenRequest = useMutation(api.deerRecovery.reopenRequest);
  const profile = useQuery(api.profile.getMyProfile, {});

  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES as never,
  });

  const isOwner = profile && request && request.userId === profile._id;
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner";
  const isClosed = request?.closedAt !== undefined;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      await addComment({
        requestId,
        content: commentText.trim(),
      });
      setCommentText("");
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    try {
      await updateStatus({ requestId, status: "resolved" });
      toast.success("Request marked as resolved");
      onBack();
    } catch (error) {
      console.error("Error resolving request:", error);
      toast.error("Failed to resolve request");
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
          <Skeleton className="mx-auto mb-4 h-12 w-12 rounded-full" />
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-none border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {request.user?.name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{request.user?.name || "Unknown Hunter"}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(request.createdAt, { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-2">
            {isOwner && !isClosed && (
              <Button
                size="sm"
                variant="default"
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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Notes */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Request Details</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant={isClosed ? "secondary" : "default"}>
                  {isClosed ? "Closed" : "Active"}
                </Badge>
                {request.requestStatus && !isClosed && (
                  <Badge variant="outline">
                    {request.requestStatus === "still_waiting" ? "Still Waiting" : "In Progress"}
                  </Badge>
                )}
              </div>
              <p className="text-sm">{request.notes}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <Phone className="mr-1 h-3 w-3" />
                  {request.phoneNumber}
                </Badge>
                {request.shotPlacement && (
                  <Badge variant="secondary">
                    {request.shotPlacement === "quartered_away" && "Shot: Quartered Away"}
                    {request.shotPlacement === "quartering_to" && "Shot: Quartering To"}
                    {request.shotPlacement === "broadside" && "Shot: Broadside"}
                  </Badge>
                )}
                {request.yardsFromHit && (
                  <Badge variant="secondary">Distance: {request.yardsFromHit} from hit</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          {request.photos && request.photos.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Blood Trail Photos</h3>
              </CardHeader>
              <CardContent>
                <PhotoDisplay photos={request.photos} />
              </CardContent>
            </Card>
          )}

          {/* Location Map */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Location</h3>
              {request.locationName && (
                <p className="text-sm text-muted-foreground">{request.locationName}</p>
              )}
            </CardHeader>
            <CardContent>
              {isLoaded && (
                <div className="h-48 overflow-hidden rounded-md">
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={{ lat: request.lat, lng: request.lng }}
                    zoom={14}
                    options={{
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    <Marker position={{ lat: request.lat, lng: request.lng }} />
                  </GoogleMap>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Comments ({request.comments.length})</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.comments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No comments yet
                </p>
              ) : (
                request.comments.map((comment) => (
                  <div key={comment._id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {comment.user?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-medium">
                          {comment.user?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(comment.createdAt, {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comment Input */}
      <div className="flex-none border-t bg-background p-4">
        <form onSubmit={handleAddComment} className="flex gap-2">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            disabled={submitting}
          />
          <Button type="submit" size="icon" disabled={submitting || !commentText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function PhotoDisplay({ photos }: { photos: string[] }) {
  const getPhotoUrl = useQuery(
    api.deerRecovery.getPhotoUrl,
    photos[0] ? { storageId: photos[0] } : "skip"
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {photos.map((photoId, index) => (
        <PhotoItem key={photoId} storageId={photoId} />
      ))}
    </div>
  );
}

function PhotoItem({ storageId }: { storageId: string }) {
  const photoUrl = useQuery(api.deerRecovery.getPhotoUrl, { storageId });

  if (!photoUrl) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md bg-muted">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt="Blood trail"
      className="h-32 w-full rounded-md object-cover"
    />
  );
}
