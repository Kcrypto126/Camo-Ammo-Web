import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { useBiometricAuth } from "@/hooks/use-biometric-auth.ts";

interface BiometricPromptProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BiometricPrompt({
  userId,
  open,
  onOpenChange,
}: BiometricPromptProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const { enableBiometric } = useBiometricAuth();

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const success = await enableBiometric(userId);
      if (success) {
        toast.success("Biometric authentication enabled!");
        onOpenChange(false);
      } else {
        toast.error("Failed to enable biometric authentication");
      }
    } catch (error) {
      toast.error("Failed to enable biometric authentication");
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Fingerprint className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Enable Biometric Sign-In</DialogTitle>
          <DialogDescription className="text-center">
            Use your fingerprint or Face ID to quickly sign in to your account
            on this device.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleEnable} disabled={isEnabling} className="w-full">
            {isEnabling ? "Setting up..." : "Enable Biometric Sign-In"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
            disabled={isEnabling}
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
