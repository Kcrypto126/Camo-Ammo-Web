import { cn } from "@/lib/utils.ts";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-muted-foreground/10 rounded-md opacity-0 animate-[fade-in_1s_ease-in-out_1s_forwards,pulse_2s_ease-in-out_1s_infinite]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
