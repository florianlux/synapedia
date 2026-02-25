import { type ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

function Card({
  className,
  ref,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      ref={ref}
      className={cn(
        "ds-card rounded-lg border border-neutral-200 bg-white text-neutral-950 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ref,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ref,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ref,
  ...props
}: ComponentPropsWithRef<"p">) {
  return (
    <p
      ref={ref}
      className={cn(
        "text-sm text-neutral-500 dark:text-neutral-400",
        className
      )}
      {...props}
    />
  );
}

function CardContent({
  className,
  ref,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  );
}

function CardFooter({
  className,
  ref,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
