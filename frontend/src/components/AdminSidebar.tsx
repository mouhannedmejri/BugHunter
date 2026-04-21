import {
  BarChart3,
  Users,
  Building2,
  FolderOpen,
  FileText,
  DollarSign,
  ScrollText,
  Layers,
  Flag,
  Megaphone,
  Activity,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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
} from '@/components/ui/sidebar';

const items = [
  { title: 'Platform Stats', url: '/admin', icon: BarChart3 },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Organizations', url: '/admin/organizations', icon: Building2 },
  { title: 'Programs', url: '/admin/programs', icon: FolderOpen },
  { title: 'Reports', url: '/admin/reports', icon: FileText },
  { title: 'Payouts', url: '/admin/payouts', icon: DollarSign },
  { title: 'Audit Logs', url: '/admin/audit-logs', icon: ScrollText },
  { title: 'Queues', url: '/admin/queues', icon: Layers },
  { title: 'Feature Flags', url: '/admin/feature-flags', icon: Flag },
  { title: 'Announcements', url: '/admin/announcements', icon: Megaphone },
  { title: 'System Health', url: '/admin/system-health', icon: Activity },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [submittedCount, setSubmittedCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const counts = await api.getVerificationCounts();
        setSubmittedCount(counts.submitted);
      } catch {
        // ignore
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" />
          {!collapsed && <span className="font-bold text-sm">BugHuntr Admin</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin'}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/admin/verifications"
                    className="hover:bg-muted/50"
                    activeClassName="bg-muted text-primary font-medium"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Verifications</span>}
                    {submittedCount > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        {submittedCount}
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
