import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, Shield, UserCog } from "lucide-react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";

interface AdministratorsPageProps {
  onBack: () => void;
}

export default function AdministratorsPage({ onBack }: AdministratorsPageProps) {
  const users = useQuery(api.roles.listUsers);

  const admins = users?.filter((u) => u.role === "owner" || u.role === "admin") || [];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Administrators</h1>
            <p className="text-xs text-muted-foreground">
              View all admins and owners
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {users === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : admins.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Shield />
                  </EmptyMedia>
                  <EmptyTitle>No Administrators</EmptyTitle>
                  <EmptyDescription>
                    No administrators have been assigned yet
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => (
              <Card key={admin._id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={admin.avatar} />
                      <AvatarFallback>
                        {admin.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{admin.name || "Unknown"}</p>
                        <Badge variant={admin.role === "owner" ? "default" : "secondary"}>
                          <span className="flex items-center gap-1">
                            {admin.role === "owner" ? (
                              <Shield className="h-3 w-3" />
                            ) : (
                              <UserCog className="h-3 w-3" />
                            )}
                            {(admin.role || "admin").toUpperCase()}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                      {admin.city && admin.state && (
                        <p className="text-xs text-muted-foreground">
                          {admin.city}, {admin.state}
                        </p>
                      )}
                    </div>
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
