import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, UserCog, Shield, User, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useState } from "react";

interface ArchivedMembersPageProps {
  onBack: () => void;
  onViewProfile: (userId: Id<"users">) => void;
}

function UserAvatar({ user }: { user: { avatar?: string; name?: string } }) {
  // Get avatar URL from storage if it's a storage ID
  const avatarUrl = useQuery(
    api.profile.getPhotoUrl,
    user.avatar && user.avatar.startsWith("kg") ? { storageId: user.avatar as never } : "skip"
  );

  return (
    <Avatar className="h-12 w-12">
      <AvatarImage src={avatarUrl || user.avatar} />
      <AvatarFallback>
        {user.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

export default function ArchivedMembersPage({ onBack, onViewProfile }: ArchivedMembersPageProps) {
  const users = useQuery(api.roles.listArchivedUsers);
  const unarchiveUser = useMutation(api.roles.unarchiveUser);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false);

  const handleUnarchive = async () => {
    if (!selectedUserId) return;
    
    try {
      await unarchiveUser({ userId: selectedUserId });
      toast.success("Member restored successfully");
      setShowUnarchiveDialog(false);
      setSelectedUserId(null);
    } catch (error) {
      toast.error("Failed to restore member");
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === "owner") return <Shield className="h-4 w-4" />;
    if (role === "admin") return <UserCog className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    if (role === "owner") return "default";
    if (role === "admin") return "secondary";
    return "outline";
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Archived Members</h1>
            <p className="text-xs text-muted-foreground">
              View and restore archived members
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {users === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No archived members
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user._id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <UserAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold truncate">{user.name || "Unknown"}</p>
                        {user.memberNumber && (
                          <Badge variant="outline" className="text-xs text-yellow-500">
                            {user.memberNumber}
                          </Badge>
                        )}
                        <Badge variant={getRoleBadgeVariant(user.role || "member")}>
                          <span className="flex items-center gap-1">
                            {getRoleIcon(user.role || "member")}
                            {(user.role || "member").toUpperCase()}
                          </span>
                        </Badge>
                        <Badge variant="secondary">ARCHIVED</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.archivedAt && (
                        <p className="text-xs text-muted-foreground">
                          Archived on {format(new Date(user.archivedAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewProfile(user._id)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedUserId(user._id);
                          setShowUnarchiveDialog(true);
                        }}
                      >
                        <RotateCcw className="mr-1 h-4 w-4" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Unarchive Confirmation Dialog */}
      <Dialog open={showUnarchiveDialog} onOpenChange={setShowUnarchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this member from the archive? They will regain access to their account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnarchiveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUnarchive}>Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
