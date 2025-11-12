import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, UserCog, Shield, User, ChevronRight, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface MemberManagementPageProps {
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

export default function MemberManagementPage({ onBack, onViewProfile }: MemberManagementPageProps) {
  const users = useQuery(api.roles.listUsers);
  const myRole = useQuery(api.roles.getMyRole);
  const changeRole = useMutation(api.roles.changeUserRole);
  const addMemberNumbers = useMutation(api.users.addMemberNumbersToExistingUsers);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleChangeRole = async (userId: Id<"users">, newRole: "owner" | "admin" | "member") => {
    try {
      await changeRole({ userId, newRole });
      toast.success(`Role updated successfully`);
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await addMemberNumbers();
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to run migration");
      console.error(error);
    } finally {
      setIsMigrating(false);
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
            <h1 className="text-lg font-bold">Member Management</h1>
            <p className="text-xs text-muted-foreground">
              Manage user roles and permissions
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Migration button - only show for owners */}
        {myRole === "owner" && users && users.some(u => !u.memberNumber) && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">Migration Available</p>
                  <p className="text-xs text-muted-foreground">
                    Some users don't have member numbers. Click to assign them.
                  </p>
                </div>
                <Button 
                  onClick={handleMigration}
                  disabled={isMigrating}
                  size="sm"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isMigrating ? "animate-spin" : ""}`} />
                  {isMigrating ? "Adding..." : "Add Member Numbers"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {users === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No members found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <Card 
                key={user._id}
                className="transition-colors hover:border-primary/50"
              >
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
                        {user.accountStatus && user.accountStatus !== "active" && (
                          <Badge variant={user.accountStatus === "banned" ? "destructive" : "secondary"}>
                            {user.accountStatus.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.city && user.state && (
                        <p className="text-xs text-muted-foreground">
                          {user.city}, {user.state}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onViewProfile(user._id)}
                      className="shrink-0"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
