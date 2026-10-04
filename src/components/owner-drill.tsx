import { AppShell, PageHeader } from "@/components/app-shell";
import { SubscriptionPill } from "@/components/subscription-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { propertyApi, type ApiProperty } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
type OwnerGroup = {
  ownerId: string;
  name: string;
  email: string;
  properties: ApiProperty[];
  floors: number;
};
export function OwnerDrill({
  title,
  description,
  propertyButton,
  ownerId,
  onOwner,
  onProperty,
  onBack,
  headerActions,
}: {
  title: string;
  description: string;
  propertyButton: string;
  ownerId: string | undefined;
  onOwner: (ownerId: string) => void;
  onProperty: (propertyId: string) => void;
  onBack: () => void;
  headerActions?: ReactNode | undefined;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["owner-drill-properties"],
    queryFn: () => propertyApi.list({ limit: 200 }),
  });
  const items = data?.items;

  const groups = useMemo(() => {
    const map = new Map<string, OwnerGroup>();
    for (const p of items ?? []) {
      const g = map.get(p.ownerId) ?? {
        ownerId: p.ownerId,
        name: p.ownerName || "—",
        email: p.ownerEmail || "—",
        properties: [],
        floors: 0,
      };
      g.properties.push(p);
      g.floors += p.floorCount ?? 0;
      map.set(p.ownerId, g);
    }
    return [...map.values()];
  }, [items]);

  const q = search.trim().toLowerCase();
  const selected = ownerId ? groups.find((g) => g.ownerId === ownerId) : undefined;

  const ownerRows = groups.filter(
    (g) => !q || g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q),
  );
  const propertyRows = (selected?.properties ?? []).filter(
    (p) => !q || p.title.toLowerCase().includes(q) || (p.city ?? "").toLowerCase().includes(q),
  );

  return (
    <AppShell>
      {selected ? (
        <>
          <Button variant="ghost" size="sm" className="mb-2" onClick={onBack}>
            <ArrowLeft className="size-4" /> All owners
          </Button>
          <PageHeader title={selected.name} description={`${selected.email} · ${selected.properties.length} properties`} />
        </>
      ) : (
        <PageHeader
          title={title}
          description={description}
          {...(headerActions ? { actions: headerActions } : {})}
        />      )}

      <div className="mb-4 relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selected ? "Search properties…" : "Search owners…"}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {selected ? (
          <Table>
            <TableHeader>
  <TableRow>
    <TableHead>Property</TableHead>
    <TableHead>City</TableHead>
    <TableHead>Floors</TableHead>
    <TableHead>Status</TableHead>
    <TableHead>Subscription</TableHead>
    <TableHead className="text-right">Actions</TableHead>
  </TableRow>
</TableHeader>
          <TableBody>
  {propertyRows.map((p) => (
    <TableRow key={p.id} className="cursor-pointer" onClick={() => onProperty(p.id)}>
      <TableCell className="font-medium">{p.title}</TableCell>

      <TableCell>{p.city}</TableCell>

      <TableCell>
        <Badge variant="outline">{p.floorCount ?? 0}</Badge>
      </TableCell>

      <TableCell>
        <Badge
          variant={p.status === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {p.status}
        </Badge>
      </TableCell>

      <TableCell>
        <SubscriptionPill endsAt={p.subscriptionEndsAt} />
      </TableCell>

      <TableCell className="text-right">
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onProperty(p.id);
          }}
        >
          {propertyButton}
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Floors</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : ownerRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No owners found.
                  </TableCell>
                </TableRow>
              ) : (
                ownerRows.map((g) => (
                  <TableRow key={g.ownerId} className="cursor-pointer" onClick={() => onOwner(g.ownerId)}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-muted-foreground">{g.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{g.properties.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{g.floors}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOwner(g.ownerId);
                        }}
                      >
                        View properties
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  );
}