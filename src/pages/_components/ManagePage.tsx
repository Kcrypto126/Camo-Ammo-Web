import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Users, Ban, CreditCard, ShieldCheck, Settings, Archive, FileText } from "lucide-react";

interface ManagePageProps {
  onNavigate: (view: "members" | "bans" | "subscriptions" | "administrators" | "permissions" | "archived" | "audit") => void;
}

export default function ManagePage({ onNavigate }: ManagePageProps) {
  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, roles, and access control
          </p>
        </div>

        <div className="grid gap-4">
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onNavigate("members")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Membership Management</CardTitle>
                  <CardDescription>
                    View and manage all members, assign roles
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onNavigate("archived")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-500/10 p-3">
                  <Archive className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                  <CardTitle>Archived Members</CardTitle>
                  <CardDescription>
                    View and restore archived members
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onNavigate("bans")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-3">
                  <Ban className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <CardTitle>Bans</CardTitle>
                  <CardDescription>
                    Manage banned users and restrictions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onNavigate("subscriptions")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <CreditCard className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle>Subscriptions</CardTitle>
                  <CardDescription>
                    View member subscriptions and billing
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onNavigate("administrators")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <ShieldCheck className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <CardTitle>Administrators</CardTitle>
                  <CardDescription>
                    View all admins and owners
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onNavigate("permissions")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <Settings className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle>Role Permissions</CardTitle>
                  <CardDescription>
                    Configure permissions for each role
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onNavigate("audit")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>
                    View all member and admin activity logs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
