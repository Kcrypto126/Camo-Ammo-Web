import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils.ts";

function ErrorState({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="error-state"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-2 border-dashed border-destructive/50 p-6 text-center text-balance md:p-12",
        className,
      )}
      {...props}
    />
  );
}

function ErrorStateHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="error-state-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className,
      )}
      {...props}
    />
  );
}

const errorStateMediaVariants = cva(
  "flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-destructive [&_svg:not([class*='size-'])]:size-12",
        icon: "bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function ErrorStateMedia({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof errorStateMediaVariants>) {
  return (
    <div
      data-slot="error-state-media"
      data-variant={variant}
      className={cn(errorStateMediaVariants({ variant, className }))}
      {...props}
    >
      {children ?? <AlertCircleIcon />}
    </div>
  );
}

function ErrorStateTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="error-state-title"
      className={cn("text-lg font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function ErrorStateDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="error-state-description"
      className={cn(
        "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
        className,
      )}
      {...props}
    />
  );
}

function ErrorStateContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="error-state-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance",
        className,
      )}
      {...props}
    />
  );
}

export {
  ErrorState,
  ErrorStateHeader,
  ErrorStateMedia,
  ErrorStateTitle,
  ErrorStateDescription,
  ErrorStateContent,
};
