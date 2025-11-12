import { useState, useEffect, useCallback } from "react";

interface BiometricAuthState {
  isAvailable: boolean;
  isEnabled: boolean;
  isSupported: boolean;
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnabled: false,
    isSupported: false,
  });

  useEffect(() => {
    // Check if WebAuthn is supported
    const isSupported =
      window.PublicKeyCredential !== undefined &&
      navigator.credentials !== undefined;

    // Check if biometric is enabled in localStorage
    const isEnabled = localStorage.getItem("biometric_enabled") === "true";

    // Check if platform authenticator (fingerprint/Face ID) is available
    if (isSupported && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          setState({
            isSupported,
            isAvailable: available,
            isEnabled: isEnabled && available,
          });
        })
        .catch(() => {
          setState({
            isSupported,
            isAvailable: false,
            isEnabled: false,
          });
        });
    } else {
      setState({
        isSupported: false,
        isAvailable: false,
        isEnabled: false,
      });
    }
  }, []);

  const enableBiometric = useCallback(async (userId: string) => {
    try {
      if (!state.isAvailable) {
        throw new Error("Biometric authentication not available");
      }

      // Create a credential
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
        {
          challenge,
          rp: {
            name: "Hunt Tracker",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName: "Hunter",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "none",
        };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      if (credential) {
        // Store credential ID and enable flag
        localStorage.setItem("biometric_enabled", "true");
        localStorage.setItem(
          "biometric_credential_id",
          btoa(String.fromCharCode(...new Uint8Array((credential as PublicKeyCredential).rawId)))
        );

        setState((prev) => ({ ...prev, isEnabled: true }));
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to enable biometric:", error);
      return false;
    }
  }, [state.isAvailable]);

  const authenticateWithBiometric = useCallback(async () => {
    try {
      if (!state.isEnabled) {
        return false;
      }

      const credentialId = localStorage.getItem("biometric_credential_id");
      if (!credentialId) {
        return false;
      }

      // Create authentication challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
        {
          challenge,
          allowCredentials: [
            {
              id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
              type: "public-key",
            },
          ],
          timeout: 60000,
          userVerification: "required",
        };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      return !!assertion;
    } catch (error) {
      console.error("Biometric authentication failed:", error);
      return false;
    }
  }, [state.isEnabled]);

  const disableBiometric = useCallback(() => {
    localStorage.removeItem("biometric_enabled");
    localStorage.removeItem("biometric_credential_id");
    setState((prev) => ({ ...prev, isEnabled: false }));
  }, []);

  return {
    ...state,
    enableBiometric,
    authenticateWithBiometric,
    disableBiometric,
  };
}
