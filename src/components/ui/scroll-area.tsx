import { type ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

type ScrollAreaProps = ComponentPropsWithRef<"div">;

function ScrollArea({ className, children, ref, ...props }: ScrollAreaProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-auto",
        // Custom scrollbar styles
        "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
        "[&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-neutral-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600",
        "[&::-webkit-scrollbar-thumb]:hover:bg-neutral-400 dark:[&::-webkit-scrollbar-thumb]:hover:bg-neutral-500",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ScrollArea };
export type { ScrollAreaProps };
