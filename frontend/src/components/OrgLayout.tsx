import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OrgSidebar } from "@/components/OrgSidebar";
import { ChevronDown, LogOut, Settings, User, ArrowLeftRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { NotificationCenter } from "@/components/NotificationCenter";
import { CommandPalette } from "@/components/CommandPalette";
import { SkipToContent } from "@/components/SkipToContent";
import { useAuthStore } from "@/stores/auth-store";

const OrgLayout = () => {
  const { user, logout } = useAuthStore();
  const display = user?.displayName ?? user?.username ?? "Account";
  const initials = display
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarProvider>
      <SkipToContent />
      <div className="min-h-screen flex w-full">
        <OrgSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex text-xs text-muted-foreground h-8 w-56 justify-start gap-2"
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <span className="flex-1 text-left">Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5 hidden sm:flex" asChild>
                <Link to="/dashboard"><ArrowLeftRight className="h-3.5 w-3.5" /> Researcher View</Link>
              </Button>
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground hidden sm:inline">{display}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild><Link to="/profile" className="cursor-pointer"><User className="mr-2 h-4 w-4" /> Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/settings" className="cursor-pointer"><Settings className="mr-2 h-4 w-4" /> Settings</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive"
                    onClick={() => {
                      void logout();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main id="main-content" className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
};

export default OrgLayout;
