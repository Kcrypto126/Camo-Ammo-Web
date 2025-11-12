import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { useBiometricAuth } from "@/hooks/use-biometric-auth.ts";

interface BiometricSignInProps {
  onSuccess: () => void;
}

export default function BiometricSignIn({ onSuccess }: BiometricSignInProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { authenticateWithBiometric } = useBiometricAuth();

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        toast.success("Authentication successful!");
        onSuccess();
      } else {
        toast.error("Biometric authentication failed");
      }
    } catch (error) {
      toast.error("Biometric authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Fingerprint className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Quick Sign-In</p>
          <p className="text-sm text-muted-foreground">
            Use biometric authentication
          </p>
        </div>
        <Button
          onClick={handleBiometricAuth}
          disabled={isAuthenticating}
          size="sm"
        >
          {isAuthenticating ? "Authenticating..." : "Use Biometric"}
        </Button>
      </CardContent>
    </Card>
  );
}
