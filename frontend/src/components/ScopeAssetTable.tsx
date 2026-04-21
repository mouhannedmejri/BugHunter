import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Pencil, History } from "lucide-react";
import { AssetTypeIcon } from "@/components/AssetTypeIcon";
import { Badge } from "@/components/ui/badge";
import type { Asset } from "@/lib/mock-data";

interface ScopeAssetTableProps {
  assets: Asset[];
  onToggle?: (id: string) => void;
  onEdit?: (id: string) => void;
  readonly?: boolean;
}

export const ScopeAssetTable = ({ assets, onToggle, onEdit, readonly }: ScopeAssetTableProps) => {
  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No assets defined yet.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Identifier</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">Description</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">In Scope</th>
            {!readonly && <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <AssetTypeIcon type={asset.type} className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs font-mono">{asset.type}</Badge>
                </div>
              </td>
              <td className="px-4 py-2 font-mono text-xs">{asset.identifier}</td>
              <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{asset.description || "—"}</td>
              <td className="px-4 py-2">
                {readonly ? (
                  <Badge variant={asset.inScope ? "default" : "secondary"} className="text-xs">
                    {asset.inScope ? "Yes" : "No"}
                  </Badge>
                ) : (
                  <Switch checked={asset.inScope} onCheckedChange={() => onToggle?.(asset.id)} />
                )}
              </td>
              {!readonly && (
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit?.(asset.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <History className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
