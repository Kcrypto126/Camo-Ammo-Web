import { SignInButton } from "@/components/ui/signin.tsx";
import BiometricSignIn from "@/components/ui/biometric-signin.tsx";
import { motion } from "motion/react";
import { useBiometricAuth } from "@/hooks/use-biometric-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";

export default function WelcomePage() {
  const { isEnabled } = useBiometricAuth();
  const { signinRedirect } = useAuth();

  const handleBiometricSuccess = () => {
    // Biometric authentication successful, trigger OIDC sign-in silently
    signinRedirect();
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://cdn.hercules.app/file_5JpYHgTxiv7txVsQFGXP90wl"
          alt="Whitetail deer buck in natural habitat"
          className="h-full w-full object-cover object-center"
        />
        {/* Orange and black overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-orange-950/50 to-black/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="mb-2 text-6xl font-bold tracking-tight text-white drop-shadow-lg md:text-7xl">
            Camo & Ammo
          </h1>
          <p className="mb-8 text-xl text-white/90 drop-shadow-md md:text-2xl">
            Track Your Hunt. Master Your Territory.
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            {isEnabled && (
              <BiometricSignIn onSuccess={handleBiometricSuccess} />
            )}
            <SignInButton size="lg" className="h-14 w-full px-8 text-lg shadow-2xl" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
