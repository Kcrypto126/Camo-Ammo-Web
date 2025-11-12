import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { NotificationBell } from "@/components/ui/notification-bell.tsx";
import {
  AlertTriangle,
  MessageSquare,
  User,
  ChevronRight,
  Store,
  Truck,
  Shield,
  Target,
  HeadphonesIcon,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import ProfilePage from "./ProfilePage.tsx";
import ForumsPage from "./ForumsPage.tsx";
import VehicleRecoveryPage from "./VehicleRecoveryPage.tsx";
import DeerRecoveryPage from "./DeerRecoveryPage.tsx";
import ContactSupportPage from "./ContactSupportPage.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface MyToolsPageProps {
  onEmergency: () => void;
  onNavigateToMarketplace: () => void;
  onNavigateToLeaseReview?: () => void;
}

export default function MyToolsPage({ onEmergency, onNavigateToMarketplace, onNavigateToLeaseReview }: MyToolsPageProps) {
  const [currentView, setCurrentView] = useState<"menu" | "profile" | "forums" | "vehicle" | "deer" | "support">("menu");
  const hasLandReviewPermission = useQuery(api.landLeases.hasLandReviewPermission, {});

  if (currentView === "profile") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex-none border-b bg-background px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("menu")}
            className="mb-2"
          >
            ← Back to My Tools
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ProfilePage />
        </div>
      </div>
    );
  }

  if (currentView === "forums") {
    return <ForumsPage onBack={() => setCurrentView("menu")} />;
  }

  if (currentView === "vehicle") {
    return <VehicleRecoveryPage onBack={() => setCurrentView("menu")} />;
  }

  if (currentView === "deer") {
    return <DeerRecoveryPage onBack={() => setCurrentView("menu")} />;
  }

  if (currentView === "support") {
    return <ContactSupportPage onBack={() => setCurrentView("menu")} />;
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">My Tools</h1>
          <NotificationBell />
        </div>
      </div>
      
      {/* Tools Options */}
      <div className="space-y-4 p-4 pb-6">
        {/* Emergency */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
          onClick={onEmergency}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-base">Emergency</CardTitle>
                  <CardDescription>Contact emergency services</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>

        {/* Vehicle Recovery */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
          onClick={() => setCurrentView("vehicle")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                  <Truck className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Vehicle Recovery</CardTitle>
                  <CardDescription>Get help from nearby hunters</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>

        {/* Deer Recovery */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
          onClick={() => setCurrentView("deer")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600/10">
                  <Target className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Deer Recovery</CardTitle>
                  <CardDescription>Need Help Recovering A Deer</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>

        {/* Contact Support */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
          onClick={() => setCurrentView("support")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <HeadphonesIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Contact Support</CardTitle>
                  <CardDescription>Get help from our team</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>

        {/* Forums */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
          onClick={() => setCurrentView("forums")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">The Hunters Lab (Forums)</CardTitle>
                  <CardDescription>Join community discussions</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>

        {/* Land Leasing Marketplace */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
          onClick={onNavigateToMarketplace}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Store className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Land Leasing</CardTitle>
                  <CardDescription>Browse and list hunting land</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>

        {/* Admin Land Review (only if user has permission) */}
        {hasLandReviewPermission && onNavigateToLeaseReview && (
          <Card
            className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
            onClick={onNavigateToLeaseReview}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Shield className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Land Review (Admin)</CardTitle>
                    <CardDescription>Review pending lease listings</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Profile */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
          onClick={() => setCurrentView("profile")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription>View and edit your profile</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
