import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet.tsx";
import BottomNav from "@/components/ui/bottom-nav.tsx";
import MyHuntPage from "./MyHuntPage.tsx";
import MyToolsPage from "./MyToolsPage.tsx";
import HuntingMap from "@/components/map/HuntingMap.tsx";
import FriendsPanel from "@/components/friends/FriendsPanel.tsx";
import ScoutingTripsPanel from "@/components/scouting/ScoutingTripsPanel.tsx";
import MarketplacePanel from "@/components/marketplace/MarketplacePanel.tsx";
import MyLeasesPanel from "@/components/marketplace/MyLeasesPanel.tsx";
import LeaseReviewPanel from "@/components/marketplace/LeaseReviewPanel.tsx";
import CreateLeaseDialog from "@/components/marketplace/CreateLeaseDialog.tsx";
import LeaseDetailsDialog from "@/components/marketplace/LeaseDetailsDialog.tsx";
import InquiryDialog from "@/components/marketplace/InquiryDialog.tsx";
import ProfilePage from "./ProfilePage.tsx";
import ProfileSetupPage from "./ProfileSetupPage.tsx";
import BiometricPrompt from "@/components/ui/biometric-prompt.tsx";
import ManagePage from "./ManagePage.tsx";
import MemberManagementPage from "./MemberManagementPage.tsx";
import BansPage from "./BansPage.tsx";
import SubscriptionsPage from "./SubscriptionsPage.tsx";
import AdministratorsPage from "./AdministratorsPage.tsx";
import RolePermissionsPage from "./RolePermissionsPage.tsx";
import ViewMemberProfilePage from "./ViewMemberProfilePage.tsx";
import ArchivedMembersPage from "./ArchivedMembersPage.tsx";
import PublicProfilePage from "./PublicProfilePage.tsx";
import AuditTrailPage from "./AuditTrailPage.tsx";
import ForumModerationPage from "./ForumModerationPage.tsx";
import OpenTicketsListPage from "./OpenTicketsListPage.tsx";
import PendingPostsListPage from "./PendingPostsListPage.tsx";
import ReportedPostsListPage from "./ReportedPostsListPage.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { AlertTriangle, Phone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { useBiometricAuth } from "@/hooks/use-biometric-auth.ts";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";

export default function Dashboard() {
  const { user } = useAuth();
  const { isAvailable, isEnabled } = useBiometricAuth();
  const userRole = useQuery(api.roles.getMyRole);
  const profile = useQuery(api.profile.getMyProfile);
  const [activeTab, setActiveTab] = useState("myhunt");
  const [showFullMap, setShowFullMap] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [showLeaseReview, setShowLeaseReview] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [membersView, setMembersView] = useState<"main" | "members" | "bans" | "subscriptions" | "administrators" | "permissions" | "archived" | "audit" | "view_profile">("main");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [showPublicProfile, setShowPublicProfile] = useState(false);
  const [publicProfileUserId, setPublicProfileUserId] = useState<Id<"users"> | null>(null);
  const [showForumModeration, setShowForumModeration] = useState(false);
  const [showOpenTicketsList, setShowOpenTicketsList] = useState(false);
  const [showPendingPostsList, setShowPendingPostsList] = useState(false);
  const [showReportedPostsList, setShowReportedPostsList] = useState(false);

  const [showCreateLeaseDialog, setShowCreateLeaseDialog] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState<Id<"landLeases"> | null>(
    null
  );
  const [showLeaseDetailsDialog, setShowLeaseDetailsDialog] = useState(false);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Show biometric prompt on first sign-in
  useEffect(() => {
    const hasShownPrompt = localStorage.getItem("biometric_prompt_shown");
    if (isAvailable && !isEnabled && !hasShownPrompt && user?.profile.sub) {
      // Delay showing the prompt slightly so user sees the app first
      const timer = setTimeout(() => {
        setShowBiometricPrompt(true);
        localStorage.setItem("biometric_prompt_shown", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAvailable, isEnabled, user]);

  const handleLeaseClick = (leaseId: Id<"landLeases">) => {
    setSelectedLeaseId(leaseId);
    setShowLeaseDetailsDialog(true);
  };

  const handleInquire = (leaseId: Id<"landLeases">) => {
    setSelectedLeaseId(leaseId);
    setShowLeaseDetailsDialog(false);
    setShowInquiryDialog(true);
  };

  const handleTabChange = (tab: string) => {
    if (tab === "map" && showFullMap) {
      setShowFullMap(false);
      setActiveTab("myhunt");
    } else {
      setActiveTab(tab);
      if (tab === "myhunt") {
        setShowFullMap(false);
      }
      if (tab === "members") {
        setMembersView("main");
      }
    }
  };

  const handleViewFullMap = () => {
    setShowFullMap(true);
    setActiveTab("map");
  };

  const handleStartTracking = () => {
    setShowFullMap(true);
    setActiveTab("map");
    toast.info("Starting GPS tracking. View the map to begin.");
  };

  const handleEmergency = () => {
    setShowEmergencyDialog(true);
  };

  const handleEmergencyCall = (service: string) => {
    setShowEmergencyDialog(false);
    toast.success(`Calling ${service}...`);
    // In a real app, this would initiate a call or send an emergency alert
  };

  const handleNavigateToMarketplace = () => {
    setActiveTab("marketplace");
    setShowLeaseReview(false);
  };

  const handleNavigateToLeaseReview = () => {
    setActiveTab("marketplace");
    setShowLeaseReview(true);
  };

  const handleViewPublicProfile = (userId: Id<"users">) => {
    setPublicProfileUserId(userId);
    setShowPublicProfile(true);
  };

  const handleNavigateToForumModeration = () => {
    setShowForumModeration(true);
  };

  const handleNavigateToOpenTickets = () => {
    setShowOpenTicketsList(true);
  };

  const handleNavigateToPendingPosts = () => {
    setShowPendingPostsList(true);
  };

  const handleNavigateToReportedPosts = () => {
    setShowReportedPostsList(true);
  };

  const handleViewTicket = (userId: Id<"users">, ticketId: Id<"supportTickets">) => {
    setShowOpenTicketsList(false);
    sessionStorage.setItem("previousMembersView", "members");
    sessionStorage.setItem("expandedTicketId", ticketId);
    setSelectedUserId(userId);
    setMembersView("view_profile");
  };

  const renderContent = () => {
    if (showOpenTicketsList) {
      return (
        <OpenTicketsListPage
          onBack={() => setShowOpenTicketsList(false)}
          onViewTicket={handleViewTicket}
        />
      );
    }

    if (showPendingPostsList) {
      return (
        <PendingPostsListPage
          onBack={() => setShowPendingPostsList(false)}
        />
      );
    }

    if (showReportedPostsList) {
      return (
        <ReportedPostsListPage
          onBack={() => setShowReportedPostsList(false)}
        />
      );
    }

    if (showForumModeration) {
      return (
        <ForumModerationPage 
          onBack={() => setShowForumModeration(false)} 
        />
      );
    }

    if (showFullMap || activeTab === "map") {
      return (
        <HuntingMap
          className="h-full w-full"
          onLocationUpdate={(lat, lng) => setUserLocation({ lat, lng })}
        />
      );
    }

    switch (activeTab) {
      case "myhunt":
        return (
          <MyHuntPage
            onViewFullMap={handleViewFullMap}
            onStartTracking={handleStartTracking}
            onEmergency={handleEmergency}
            userRole={userRole || undefined}
            onNavigateToForumModeration={handleNavigateToForumModeration}
            onNavigateToOpenTickets={handleNavigateToOpenTickets}
            onNavigateToPendingPosts={handleNavigateToPendingPosts}
            onNavigateToReportedPosts={handleNavigateToReportedPosts}
          />
        );
      case "mytools":
        return (
          <MyToolsPage
            onEmergency={handleEmergency}
            onNavigateToMarketplace={handleNavigateToMarketplace}
            onNavigateToLeaseReview={handleNavigateToLeaseReview}
          />
        );
      case "scouting":
        return <ScoutingTripsPanel onViewProfile={handleViewPublicProfile} />;
      case "marketplace":
        return showLeaseReview ? (
          <LeaseReviewPanel onLeaseClick={handleLeaseClick} />
        ) : (
          <MarketplacePanel onLeaseClick={handleLeaseClick} />
        );
      case "friends":
        return <FriendsPanel onViewProfile={handleViewPublicProfile} />;
      case "members":
        if (membersView === "view_profile" && selectedUserId) {
          // Track where we came from before viewing profile
          const previousView = sessionStorage.getItem("previousMembersView") || "members";
          return (
            <ViewMemberProfilePage
              userId={selectedUserId}
              onBack={() => {
                setMembersView(previousView as typeof membersView);
                setSelectedUserId(null);
              }}
            />
          );
        } else if (membersView === "members") {
          return (
            <MemberManagementPage
              onBack={() => setMembersView("main")}
              onViewProfile={(userId) => {
                sessionStorage.setItem("previousMembersView", "members");
                setSelectedUserId(userId);
                setMembersView("view_profile");
              }}
            />
          );
        } else if (membersView === "archived") {
          return (
            <ArchivedMembersPage
              onBack={() => setMembersView("main")}
              onViewProfile={(userId) => {
                sessionStorage.setItem("previousMembersView", "archived");
                setSelectedUserId(userId);
                setMembersView("view_profile");
              }}
            />
          );
        } else if (membersView === "bans") {
          return <BansPage onBack={() => setMembersView("main")} />;
        } else if (membersView === "subscriptions") {
          return <SubscriptionsPage onBack={() => setMembersView("main")} />;
        } else if (membersView === "administrators") {
          return <AdministratorsPage onBack={() => setMembersView("main")} />;
        } else if (membersView === "permissions") {
          return <RolePermissionsPage onBack={() => setMembersView("main")} />;
        } else if (membersView === "audit") {
          return <AuditTrailPage onBack={() => setMembersView("main")} />;
        }
        return <ManagePage onNavigate={setMembersView} />;
      default:
        return (
          <MyHuntPage
            onViewFullMap={handleViewFullMap}
            onStartTracking={handleStartTracking}
            onEmergency={handleEmergency}
          />
        );
    }
  };

  const displayTab = showFullMap ? "map" : activeTab;

  // Show loading state while checking profile completion
  if (profile === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show profile setup if not completed
  if (!profile?.profileCompleted) {
    return <ProfileSetupPage />;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Minimal Header - Only show on non-map tabs */}
      {!showFullMap && activeTab !== "map" && activeTab !== "myhunt" && activeTab !== "mytools" && activeTab !== "members" && (
        <header className="z-[1001] flex-none border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-lg font-bold tracking-tight">
              {activeTab === "scouting" && "Scouting Trips"}
              {activeTab === "marketplace" && (showLeaseReview ? "Admin: Review Leases" : "Land Leasing")}
              {activeTab === "friends" && "Friends"}
            </h1>
            {activeTab === "marketplace" && showLeaseReview && (
              <Button variant="ghost" size="sm" onClick={() => setShowLeaseReview(false)}>
                Back
              </Button>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-background">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={displayTab} onTabChange={handleTabChange} userRole={userRole} />

      {/* Emergency Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Emergency Services
            </DialogTitle>
            <DialogDescription>
              Contact emergency services immediately if you need help.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="destructive"
              className="w-full justify-start text-lg"
              size="lg"
              onClick={() => handleEmergencyCall("911")}
            >
              <Phone className="mr-3 h-5 w-5" />
              Call 911
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleEmergencyCall("Local Ranger Station")}
            >
              <Phone className="mr-3 h-4 w-4" />
              Contact Local Ranger Station
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleEmergencyCall("Emergency Contact")}
            >
              <Phone className="mr-3 h-4 w-4" />
              Call Emergency Contact
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowEmergencyDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <CreateLeaseDialog
        open={showCreateLeaseDialog}
        onOpenChange={setShowCreateLeaseDialog}
      />

      <LeaseDetailsDialog
        leaseId={selectedLeaseId}
        open={showLeaseDetailsDialog}
        onOpenChange={setShowLeaseDetailsDialog}
        onInquire={handleInquire}
      />

      <InquiryDialog
        leaseId={selectedLeaseId}
        open={showInquiryDialog}
        onOpenChange={setShowInquiryDialog}
      />

      {/* Biometric Prompt */}
      {user?.profile.sub && (
        <BiometricPrompt
          userId={user.profile.sub}
          open={showBiometricPrompt}
          onOpenChange={setShowBiometricPrompt}
        />
      )}

      {/* Public Profile Sheet */}
      <Sheet open={showPublicProfile} onOpenChange={setShowPublicProfile}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
          {publicProfileUserId && (
            <PublicProfilePage
              userId={publicProfileUserId}
              onBack={() => setShowPublicProfile(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
