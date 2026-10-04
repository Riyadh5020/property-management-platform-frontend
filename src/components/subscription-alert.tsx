import { Badge } from "@/components/ui/badge";
import { type Row } from "@/lib/mock-data";
import { AlertTriangle, Clock } from "lucide-react";

export function daysLeft(endsAt: unknown): number | null {
  if (!endsAt) return null;
  const ms = new Date(String(endsAt)).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.ceil(ms / 86_400_000);
}

export function SubscriptionPill({ endsAt }: { endsAt: unknown }) {
  const d = daysLeft(endsAt);
  if (d === null) return <Badge variant="outline">No subscription</Badge>;
  if (d <= 0) return <Badge variant="destructive">Expired</Badge>;
  const variant = d <= 7 ? "destructive" : d <= 30 ? "secondary" : "default";
  return (
    <Badge variant={variant}>
      {d} day{d === 1 ? "" : "s"} left
    </Badge>
  );
}

export function SubscriptionAlerts({ rows, canRenew }: { rows: Row[]; canRenew: boolean }) {
  const due = rows
    .map((r) => ({ r, d: daysLeft(r["subscriptionEndsAt"]) }))
    .filter((x): x is { r: Row; d: number } => x.d !== null && x.d <= 30);

  if (due.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {due.map(({ r, d }) => {
        const urgent = d <= 7;
        return (
          <div
            key={r.id}
            className={`flex items-center gap-3 rounded-xl border-l-4 px-4 py-3 ${
              urgent ? "border-l-destructive bg-destructive/10" : "border-l-amber-500 bg-amber-500/10"
            }`}
          >
            {urgent ? (
              <AlertTriangle className="size-5 shrink-0 text-destructive" />
            ) : (
              <Clock className="size-5 shrink-0 text-amber-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{String(r["title"])}</p>
              <p className="text-xs text-muted-foreground">
                {d <= 0 ? "Subscription expired." : `Subscription ends in ${d} day${d === 1 ? "" : "s"}.`}{" "}
                {canRenew ? "Open the property to renew." : "Contact your administrator to renew."}
              </p>
            </div>
            <Badge variant={urgent ? "destructive" : "secondary"} className="shrink-0">
              {d <= 0 ? "Expired" : `${d}d left`}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}