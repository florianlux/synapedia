import { type ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

type SeparatorProps = ComponentPropsWithRef<"div"> & {
  orientation?: "horizontal" | "vertical";
};

function Separator({
  className,
  orientation = "horizontal",
  ref,
  ...props
}: SeparatorProps) {
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-neutral-200 dark:bg-neutral-800",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
export type { SeparatorProps };
