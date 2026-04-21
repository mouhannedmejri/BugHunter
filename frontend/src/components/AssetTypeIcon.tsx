import { Globe, Server, Wifi, Smartphone, Code, GitBranch, Cloud, ExternalLink, Cpu } from "lucide-react";
import type { AssetType } from "@/lib/mock-data";

const iconMap: Record<AssetType, React.ElementType> = {
  DOMAIN: Globe,
  SUBDOMAIN: Globe,
  IP_RANGE: Server,
  MOBILE_APP: Smartphone,
  API: Code,
  REPOSITORY: GitBranch,
  CLOUD: Cloud,
  THIRD_PARTY: ExternalLink,
  PHYSICAL: Cpu,
};

export const AssetTypeIcon = ({ type, className = "h-4 w-4" }: { type: AssetType; className?: string }) => {
  const Icon = iconMap[type] || Globe;
  return <Icon className={className} />;
};
