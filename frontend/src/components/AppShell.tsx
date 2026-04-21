import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NotificationCenter } from "@/components/NotificationCenter";
import { CommandPalette } from "@/components/CommandPalette";
import { SkipToContent } from "@/components/SkipToContent";

interface AppShellProps {
  sidebar: ReactNode;
  userMenu?: ReactNode;
  children: ReactNode;
  mobileNav?: boolean;
}

export const AppShell = ({ sidebar, userMenu, children, mobileNav = true }: AppShellProps) => (
  <SidebarProvider>
    <SkipToContent />
    <div className="min-h-screen flex w-full">
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            {userMenu}
          </div>
        </header>
        <main id="main-content" className="flex-1 overflow-auto pb-16 sm:pb-0">
          {children}
        </main>
        {mobileNav ? <MobileBottomNav /> : null}
      </div>
    </div>
    <CommandPalette />
  </SidebarProvider>
);
