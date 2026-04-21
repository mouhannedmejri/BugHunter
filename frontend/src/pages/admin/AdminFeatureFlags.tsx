import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, Save } from "lucide-react";
import { mockFeatureFlags, type FeatureFlag } from "@/lib/admin-mock-data";
import { toast } from "sonner";

const AdminFeatureFlags = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>(mockFeatureFlags);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggle = (key: string) => {
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));
    toast.success(`Flag ${key} toggled`);
  };

  const startEdit = (flag: FeatureFlag) => {
    setEditingKey(flag.key);
    setEditValue(flag.value || "");
  };

  const saveEdit = (key: string) => {
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, value: editValue } : f));
    setEditingKey(null);
    toast.success(`Flag ${key} value updated`);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Feature Flags</h1>
        <Badge variant="secondary" className="text-xs">{flags.filter((f) => f.enabled).length}/{flags.length} enabled</Badge>
      </div>

      <div className="space-y-3">
        {flags.map((flag) => (
          <Card key={flag.key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Flag className={`h-4 w-4 shrink-0 ${flag.enabled ? "text-success" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{flag.key}</span>
                      {flag.enabled && <Badge className="text-[10px] bg-success/10 text-success border-success/20">ON</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                  </div>
                </div>
                <Switch checked={flag.enabled} onCheckedChange={() => toggle(flag.key)} />
              </div>

              {flag.value !== undefined && (
                <div className="mt-3 pl-7">
                  {editingKey === flag.key ? (
                    <div className="flex gap-2">
                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-8 text-sm font-mono max-w-xs" />
                      <Button size="sm" className="h-8 gap-1" onClick={() => saveEdit(flag.key)}>
                        <Save className="h-3 w-3" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingKey(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Value:</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded cursor-pointer hover:bg-muted/80" onClick={() => startEdit(flag)}>
                        {flag.value || "(empty)"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminFeatureFlags;
