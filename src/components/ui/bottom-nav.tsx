import { cn } from "@/lib/utils.ts";
import { MapIcon, Building2, Binoculars, Users, Wrench, Shield } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole?: string | null;
}

const baseTabs = [
  { id: "myhunt", label: "HQ", icon: Building2 },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "scouting", label: "Scouting", icon: Binoculars },
  { id: "friends", label: "Friends", icon: Users },
  { id: "mytools", label: "My Tools", icon: Wrench },
];

export default function BottomNav({ activeTab, onTabChange, userRole }: BottomNavProps) {
  const tabs = [...baseTabs];
  
  // Add Members tab for admins and owners
  if (userRole === "owner" || userRole === "admin") {
    tabs.push({ id: "members", label: "Members", icon: Shield });
  }
  
  return (
    <nav className="z-[1002] flex-none border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-screen-xl items-center justify-around px-2 py-2 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
