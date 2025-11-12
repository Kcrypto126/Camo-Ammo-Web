import { useCallback } from "react";
import {
  AuthProvider as ReactAuthProvider,
  type AuthProviderProps,
} from "react-oidc-context";

const AUTH_CONFIG: AuthProviderProps = {
  authority: import.meta.env.VITE_HERCULES_OIDC_AUTHORITY!,
  client_id: import.meta.env.VITE_HERCULES_OIDC_CLIENT_ID!,
  prompt: import.meta.env.VITE_HERCULES_OIDC_PROMPT ?? "select_account",
  response_type: import.meta.env.VITE_HERCULES_OIDC_RESPONSE_TYPE ?? "code",
  scope: import.meta.env.VITE_HERCULES_OIDC_SCOPE ?? "openid profile email",
  redirect_uri:
    import.meta.env.VITE_HERCULES_OIDC_REDIRECT_URI ??
    `${window.location.origin}/auth/callback`,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const onSigninCallback = useCallback(() => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);
  const onSignoutCallback = useCallback(() => {
    window.location.pathname = "";
  }, []);

  return (
    <ReactAuthProvider
      {...AUTH_CONFIG}
      onSigninCallback={onSigninCallback}
      onSignoutCallback={onSignoutCallback}
    >
      {children}
    </ReactAuthProvider>
  );
}
