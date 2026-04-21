import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileText, Search, Trophy, Bug, LayoutDashboard, Settings, User, DollarSign,
} from "lucide-react";
import { api } from "@/lib/api";

const quickLinks = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Discover Programs", icon: Search, href: "/programs" },
  { label: "My Reports", icon: FileText, href: "/reports" },
  { label: "Rewards", icon: DollarSign, href: "/rewards" },
  { label: "Leaderboard", icon: Trophy, href: "/leaderboard" },
  { label: "Profile", icon: User, href: "/profile" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

type SearchResult = { label: string; href: string; icon: typeof Search };

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const [reports, programs, researchers] = await Promise.all([
          api.get<{ items: Array<{ id: string; title: string }> }>(
            `/search/reports?q=${encodeURIComponent(query)}&take=3`,
          ),
          api.get<{ items: Array<{ slug: string; title: string }> }>(
            `/search/programs?q=${encodeURIComponent(query)}&take=3`,
          ),
          api.get<{ items: Array<{ username: string }> }>(
            `/search/researchers?q=${encodeURIComponent(query)}&take=3`,
          ),
        ]);

        setResults([
          ...reports.items.map((r) => ({
            label: r.title,
            href: `/reports/${r.id}`,
            icon: Bug,
          })),
          ...programs.items.map((p) => ({
            label: p.title,
            href: `/programs/${p.slug}`,
            icon: Search,
          })),
          ...researchers.items.map((u) => ({
            label: `@${u.username}`,
            href: `/profile/${u.username}`,
            icon: User,
          })),
        ]);
      } catch {
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search reports, programs, researchers..."
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Links">
          {quickLinks.map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item.href)}>
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Results">
          {results.map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item.href)}>
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
