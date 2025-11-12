import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.ts";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, error } = useAuth();

  useEffect(() => {
    // Redirect to home after auth completes
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
    // Handle auth errors
    else if (!isLoading && error) {
      console.error("Authentication error:", error);
      navigate("/", { replace: true });
    }
    // Handle auth cancellation/failure
    else if (!isLoading && !isAuthenticated && !error) {
      console.warn(
        "Authentication completed without success or explicit error",
      );
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, error, navigate]);

  return (
    <div className="flex items-center justify-center h-[100svh]">
      <Spinner className="size-8" />
    </div>
  );
}
