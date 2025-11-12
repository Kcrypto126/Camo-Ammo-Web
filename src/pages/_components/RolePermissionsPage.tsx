import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, Shield, UserCog, User, Info } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";

interface RolePermissionsPageProps {
  onBack: () => void;
}

const PERMISSION_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  view_users: {
    name: "View Users",
    description: "Can view the list of all users and their profiles",
  },
  edit_users: {
    name: "Edit Users",
    description: "Can edit user profiles and information",
  },
  delete_users: {
    name: "Delete Users",
    description: "Can permanently delete user accounts",
  },
  ban_users: {
    name: "Ban Users",
    description: "Can ban users from the platform",
  },
  manage_roles: {
    name: "Manage Roles",
    description: "Can assign and change user roles",
  },
  moderate_forums: {
    name: "Moderate Forums",
    description: "Can moderate forum posts and comments",
  },
  moderate_marketplace: {
    name: "Moderate Marketplace",
    description: "Can review and approve marketplace listings",
  },
  manage_subscriptions: {
    name: "Manage Subscriptions",
    description: "Can manage user subscriptions and billing",
  },
  view_analytics: {
    name: "View Analytics",
    description: "Can view platform analytics and reports",
  },
};

const ROLES = [
  { id: "owner", name: "Owner", icon: Shield, color: "text-primary" },
  { id: "admin", name: "Administrator", icon: UserCog, color: "text-amber-500" },
  { id: "member", name: "Member", icon: User, color: "text-muted-foreground" },
];

export default function RolePermissionsPage({ onBack }: RolePermissionsPageProps) {
  const rolePermissions = useQuery(api.roles.getAllRolePermissions);
  const updatePermissions = useMutation(api.roles.updateRolePermissions);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const handleTogglePermission = async (
    role: "owner" | "admin" | "member",
    permission: string,
    currentlyHas: boolean
  ) => {
    if (!rolePermissions) return;

    const currentPermissions = rolePermissions[role] || [];
    const newPermissions = currentlyHas
      ? currentPermissions.filter((p) => p !== permission)
      : [...currentPermissions, permission];

    setSavingRole(role);
    try {
      await updatePermissions({ role, permissions: newPermissions });
      toast.success(`${ROLES.find((r) => r.id === role)?.name} permissions updated`);
    } catch (error) {
      toast.error("Failed to update permissions");
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Role Permissions</h1>
            <p className="text-xs text-muted-foreground">
              Configure permissions for each role
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Info Card */}
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Manage Role Permissions</p>
              <p className="mt-1 text-muted-foreground">
                Configure what each role can do in the application. Changes apply immediately to all users with that role.
              </p>
            </div>
          </CardContent>
        </Card>

        {rolePermissions === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : (
          <Accordion type="single" collapsible defaultValue="owner" className="space-y-3">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const permissions: string[] = rolePermissions[role.id as keyof typeof rolePermissions] || [];
              const allPermissions = Object.keys(PERMISSION_DESCRIPTIONS);
              const isSaving = savingRole === role.id;

              return (
                <Card key={role.id}>
                  <AccordionItem value={role.id} className="border-0">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg bg-muted p-2 ${role.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{role.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {permissions.length} {permissions.length === 1 ? "permission" : "permissions"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {role.id === "owner" && "Full system access with all permissions"}
                            {role.id === "admin" && "Elevated privileges for platform management"}
                            {role.id === "member" && "Standard user access"}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1 px-6 pb-4">
                        {allPermissions.map((permission) => {
                          const hasPermission = permissions.includes(permission);
                          const permInfo = PERMISSION_DESCRIPTIONS[permission];
                          const isOwnerRole = role.id === "owner";

                          return (
                            <div
                              key={permission}
                              className="flex items-start justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                            >
                              <div className="flex-1 space-y-1">
                                <Label
                                  htmlFor={`${role.id}-${permission}`}
                                  className="cursor-pointer font-medium"
                                >
                                  {permInfo.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {permInfo.description}
                                </p>
                              </div>
                              <Switch
                                id={`${role.id}-${permission}`}
                                checked={hasPermission}
                                disabled={isSaving || isOwnerRole}
                                onCheckedChange={
                                  role.id === "owner" || role.id === "admin" || role.id === "member"
                                    ? () =>
                                        handleTogglePermission(
                                          role.id as "owner" | "admin" | "member",
                                          permission,
                                          hasPermission
                                        )
                                    : undefined
                                }
                              />
                            </div>
                          );
                        })}
                        {role.id === "owner" && (
                          <p className="pt-2 text-xs text-muted-foreground">
                            Owner permissions cannot be modified. Owners always have full access.
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Card>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
