import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, MapPin, Calendar, Trophy, Heart, Crosshair } from "lucide-react";
import { format } from "date-fns";

interface PublicProfilePageProps {
  userId: Id<"users">;
  onBack: () => void;
}

export default function PublicProfilePage({ userId, onBack }: PublicProfilePageProps) {
  const profile = useQuery(api.profile.getPublicProfile, { userId });
  
  // Get avatar URL from storage if it's a storage ID
  const avatarUrl = useQuery(
    api.profile.getPhotoUrl,
    profile?.avatar && profile.avatar.startsWith("kg") ? { storageId: profile.avatar as never } : "skip"
  );

  if (profile === undefined) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const memberSince = profile._creationTime
    ? format(new Date(profile._creationTime), "MMMM yyyy")
    : "Unknown";

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Member Profile</h1>
            <p className="text-xs text-muted-foreground">
              View member information
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Profile Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={avatarUrl || profile.avatar} />
                <AvatarFallback className="text-2xl">
                  {profile.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{profile.name || "Unknown"}</h2>
              {profile.username && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}
              {(profile.city || profile.state) && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {[profile.city, profile.state].filter(Boolean).join(", ")}
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Member since {memberSince}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio Card */}
        {profile.bio && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Hunting Info Card */}
        {(profile.yearsOfExperience || profile.favoriteSpecies || profile.huntingPreferences || profile.weaponTypes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crosshair className="h-4 w-4" />
                Hunting Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.yearsOfExperience !== undefined && profile.yearsOfExperience !== null && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Experience</p>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-medium">
                      {profile.yearsOfExperience} {profile.yearsOfExperience === 1 ? "year" : "years"}
                    </p>
                  </div>
                </div>
              )}
              {profile.favoriteSpecies && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Favorite Species</p>
                  <Badge variant="secondary">{profile.favoriteSpecies}</Badge>
                </div>
              )}
              {profile.huntingPreferences && profile.huntingPreferences.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Hunting Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.huntingPreferences.map((pref) => (
                      <Badge key={pref} variant="outline">
                        {pref}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.weaponTypes && profile.weaponTypes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Weapon Types</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.weaponTypes.map((weapon) => (
                      <Badge key={weapon} variant="outline">
                        {weapon}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hobbies Card */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Hobbies & Interests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.hobbies.map((hobby) => (
                  <Badge key={hobby} variant="secondary">
                    {hobby}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Gallery Card */}
        {profile.profilePhotos && profile.profilePhotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {profile.profilePhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <img
                      src={photo}
                      alt={`Profile photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
