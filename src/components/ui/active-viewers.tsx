import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Eye } from "lucide-react";
import { useEffect, useRef } from "react";

interface ActiveViewersProps {
  entityType: string;
  entityId: string;
}

export function ActiveViewers({ entityType, entityId }: ActiveViewersProps) {
  const viewers = useQuery(api.activeViewers.getActiveViewers, {
    entityType,
    entityId,
  });
  const registerViewer = useMutation(api.activeViewers.registerViewer);
  const unregisterViewer = useMutation(api.activeViewers.unregisterViewer);
  
  // Keep track of registration
  const registeredRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Register on mount
    const register = async () => {
      try {
        await registerViewer({ entityType, entityId });
        registeredRef.current = true;
      } catch (error) {
        console.error("Failed to register viewer:", error);
      }
    };

    register();

    // Keep alive - update every 15 seconds
    intervalRef.current = setInterval(() => {
      if (registeredRef.current) {
        registerViewer({ entityType, entityId }).catch(console.error);
      }
    }, 15000);

    // Unregister on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (registeredRef.current) {
        unregisterViewer({ entityType, entityId }).catch(console.error);
      }
    };
  }, [entityType, entityId, registerViewer, unregisterViewer]);

  if (!viewers || viewers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
      <Eye className="h-4 w-4 text-blue-500 flex-none" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
          Also viewing:
        </span>
        {viewers.map((viewer) => {
          const initials = viewer.userName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div key={viewer.userId} className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src={viewer.userAvatar} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <Badge variant="secondary" className="text-xs">
                {viewer.userName}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
