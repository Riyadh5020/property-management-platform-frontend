import { cn } from "@/lib/utils";

export function CountBadge({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-5 text-white",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}