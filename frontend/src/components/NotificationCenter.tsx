import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, Check, Bug, DollarSign, MessageSquare, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

const typeIcons = {
  report_update: Bug,
  reward: DollarSign,
  comment: MessageSquare,
  system: Info,
};

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{
          notifications: Notification[];
          unreadCount: number;
        }>("/notifications?page=1&limit=20");
        setNotifications(res.notifications);
      } catch (e) {
        const err = e as ApiError;
        toast.error(err.message || "Failed to load notifications");
      }
    };
    void load();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put<{ message: string }>("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
    } catch (e) {
      toast.error((e as ApiError).message || "Failed to mark all as read");
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.put<{ message: string }>(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
        ),
      );
    } catch (e) {
      toast.error((e as ApiError).message || "Failed to mark as read");
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-96 p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{unreadCount}</Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                <Check className="mr-1 h-3 w-3" /> Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type as keyof typeof typeIcons] ?? Info;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                      !n.readAt && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5",
                      !n.readAt ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !n.readAt ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.readAt && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
