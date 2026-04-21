import {
  LayoutDashboard,
  Shield,
  Users,
  Settings,
  CreditCard,
  Puzzle,
  ClipboardList,
  BarChart3,
  DollarSign,
  Bug,
  ChevronsUpDown,
  Building2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";

export function OrgSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { orgSlug = "" } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const base = `/org/${orgSlug}`;
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const orgSlugs = [...new Set(user?.orgMemberships?.map((m) => m.org.slug) ?? [])];

  const { data: currentOrg } = useQuery({
    queryKey: ["orgDetail", orgSlug],
    queryFn: () => api.get<{ name: string; slug: string }>(apiPaths.organizations.bySlug(orgSlug)),
    enabled: !!orgSlug,
  });

  const mainItems = [
    { title: "Overview", url: base, icon: LayoutDashboard, end: true },
    { title: "Programs", url: `${base}/programs`, icon: Shield },
    { title: "Triage", url: `${base}/triage`, icon: ClipboardList },
    { title: "Analytics", url: `${base}/analytics`, icon: BarChart3 },
    { title: "Rewards", url: `${base}/rewards`, icon: DollarSign },
    { title: "Members", url: `${base}/members`, icon: Users },
  ];

  const settingsItems = [
    { title: "Settings", url: `${base}/settings`, icon: Settings },
    { title: "Integrations", url: `${base}/integrations`, icon: Puzzle },
    { title: "Billing", url: `${base}/billing`, icon: CreditCard },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Bug className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-base font-bold tracking-tight text-foreground">BugHuntr</span>}
        </div>
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between mt-3 h-9 text-sm gap-2 px-2">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{currentOrg?.name ?? orgSlug}</span>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {orgSlugs.length === 0 && (
                <DropdownMenuItem disabled>No other organizations</DropdownMenuItem>
              )}
              {orgSlugs.map((slug) => (
                <DropdownMenuItem key={slug} asChild>
                  <NavLink to={`/org/${slug}`} className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" /> {slug}
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.end ? location.pathname === item.url : isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator className="mx-4 w-auto" />
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
