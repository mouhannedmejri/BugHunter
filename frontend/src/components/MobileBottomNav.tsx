import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Search, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Programs", icon: Search, href: "/programs" },
  { label: "Reports", icon: FileText, href: "/reports" },
  { label: "Profile", icon: User, href: "/profile" },
];

export const MobileBottomNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex sm:hidden border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-bottom" role="navigation" aria-label="Mobile navigation">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
