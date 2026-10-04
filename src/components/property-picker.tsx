import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { propertyApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function PropertyPicker({
  title,
  description,
  buttonLabel,
  onProperty,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onProperty: (propertyId: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["property-picker"],
    queryFn: () => propertyApi.list({ limit: 100 }),
  });
  const items = data?.items ?? [];

  return (
    <AppShell>
      <PageHeader title={title} description={description} />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Floors</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No properties yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => onProperty(p.id)}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.city}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.floorCount ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onProperty(p.id);
                      }}
                    >
                      {buttonLabel}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}