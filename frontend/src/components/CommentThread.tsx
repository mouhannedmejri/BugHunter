import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Send, Lock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Comment } from "@/lib/report-mock-data";
import { cn } from "@/lib/utils";
import { api, apiPaths } from "@/lib/api";
import { useParams } from "react-router-dom";

interface CommentThreadProps {
  comments: Comment[];
  isOrgMember?: boolean;
}

const roleBadge = (role: Comment["authorRole"]) => {
  if (role === "reviewer") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-secondary text-secondary">Reviewer</Badge>;
  if (role === "org_admin") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">Admin</Badge>;
  return null;
};

export const CommentThread = ({ comments, isOrgMember = false }: CommentThreadProps) => {
  const [reply, setReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id: reportId } = useParams<{ id: string }>();
  const visibleComments = isOrgMember ? comments : comments.filter((c) => !c.isInternal);

  const handleSubmit = async () => {
    if (!reply.trim() || !reportId) return;
    
    setIsSubmitting(true);
    try {
      await api.post(apiPaths.reports.comments(reportId), { 
        body: reply.trim(), 
        isInternal: false 
      });
      setReply("");
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Comments ({visibleComments.length})
      </h3>

      <div className="space-y-3">
        {visibleComments.map((c) => (
          <div
            key={c.id}
            className={cn(
              "rounded-lg border border-border p-3 space-y-2",
              c.isInternal && "bg-warning/5 border-warning/20"
            )}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                  {c.authorName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{c.authorName}</span>
              {roleBadge(c.authorRole)}
              {c.isInternal && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning text-warning gap-0.5">
                  <Lock className="h-2.5 w-2.5" /> Internal
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(c.createdAt), "MMM d, HH:mm")}
              </span>
            </div>
            <MarkdownContent body={c.body} />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a comment… (Ctrl+Enter to submit)"
          rows={2}
          className="text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
        <Button 
          size="icon" 
          className="shrink-0 self-end" 
          onClick={handleSubmit} 
          disabled={!reply.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
