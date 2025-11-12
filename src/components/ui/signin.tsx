import { forwardRef, useCallback, useEffect } from "react";
import { type VariantProps } from "class-variance-authority";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button, buttonVariants } from "@/components/ui/button.tsx";

export interface SignInButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick">,
    VariantProps<typeof buttonVariants> {
  /**
   * Custom onClick handler that runs before authentication action
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Whether to show icons in the button
   * @default true
   */
  showIcon?: boolean;
  /**
   * Custom text for sign in state
   * @default "Sign In"
   */
  signInText?: string;
  /**
   * Custom text for sign out state
   * @default "Sign Out"
   */
  signOutText?: string;
  /**
   * Custom text for loading state
   * @default "Signing In..." or "Signing Out..."
   */
  loadingText?: string;
  /**
   * Whether to use the asChild pattern
   * @default false
   */
  asChild?: boolean;
}

/**
 * A button component that handles authentication sign in/out with proper loading states
 * and accessibility features.
 */
export const SignInButton = forwardRef<HTMLButtonElement, SignInButtonProps>(
  (
    {
      onClick,
      disabled,
      showIcon = true,
      signInText = "Sign In",
      signOutText = "Sign Out",
      loadingText,
      className,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const { isAuthenticated, signinRedirect, removeUser, isLoading, error } =
      useAuth();

    useEffect(() => {
      if (error) {
        toast.error("Login error", {
          description: error.message,
        });
        console.error("Login error", error);
      }
    }, [error]);

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        // Run custom onClick first
        onClick?.(event);

        try {
          if (isAuthenticated) {
            await removeUser();
          } else {
            await signinRedirect();
          }
        } catch (err) {
          console.error("Authentication error:", err);
          // Don't prevent the default here as the auth library handles errors
        }
      },
      [isAuthenticated, signinRedirect, removeUser, onClick],
    );

    const isDisabled = disabled || isLoading;
    const defaultLoadingText = isAuthenticated
      ? "Signing Out..."
      : "Signing In...";
    const currentLoadingText = loadingText || defaultLoadingText;

    const buttonText = isLoading
      ? currentLoadingText
      : isAuthenticated
        ? signOutText
        : signInText;

    const icon = isLoading ? (
      <Loader2 className="size-4 animate-spin" />
    ) : isAuthenticated ? (
      <LogOut className="size-4" />
    ) : (
      <LogIn className="size-4" />
    );

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={className}
        asChild={asChild}
        aria-label={
          isAuthenticated
            ? "Sign out of your account"
            : "Sign in to your account"
        }
        aria-describedby={error ? "auth-error" : undefined}
        {...props}
      >
        {showIcon && icon}
        {buttonText}
      </Button>
    );
  },
);

SignInButton.displayName = "SignInButton";
