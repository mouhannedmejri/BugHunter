import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MDEditor } from "@/components/MDEditor";
import { Megaphone, Send, Clock } from "lucide-react";
import { mockAnnouncements, type Announcement } from "@/lib/admin-mock-data";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  SENT: "bg-success/10 text-success",
  SCHEDULED: "bg-warning/10 text-warning",
  DRAFT: "bg-muted text-muted-foreground",
};

const AdminAnnouncements = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL" | "RESEARCHERS" | "ORGS">("ALL");

  const handleSend = () => {
    if (!title || !body) {
      toast.error("Title and body are required");
      return;
    }
    toast.success("Announcement sent!");
    setTitle("");
    setBody("");
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Announcements</h1>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">New Announcement</h3>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title..." />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <MDEditor value={body} onChange={setBody} placeholder="Write your announcement (markdown supported)..." minRows={5} />
          </div>

          <div className="space-y-2">
            <Label>Audience</Label>
            <RadioGroup value={audience} onValueChange={(v) => setAudience(v as any)} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ALL" id="all" />
                <Label htmlFor="all" className="text-sm cursor-pointer">All Users</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="RESEARCHERS" id="researchers" />
                <Label htmlFor="researchers" className="text-sm cursor-pointer">Researchers</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ORGS" id="orgs" />
                <Label htmlFor="orgs" className="text-sm cursor-pointer">Organizations</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2">
            <Button className="gap-1.5" onClick={handleSend}><Send className="h-3.5 w-3.5" /> Send Now</Button>
            <Button variant="outline" className="gap-1.5" onClick={() => toast.info("Schedule modal")}><Clock className="h-3.5 w-3.5" /> Schedule</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-4">Previous Announcements</h2>
        <div className="space-y-3">
          {mockAnnouncements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{a.title}</h4>
                    <Badge className={`text-[10px] ${statusColors[a.status]}`}>{a.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{a.audience}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
