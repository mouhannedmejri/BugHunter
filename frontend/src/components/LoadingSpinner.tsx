import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => (
  <Loader2 className={cn("animate-spin text-muted-foreground", sizes[size], className)} />
);

export const FullPageSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <LoadingSpinner size="lg" />
  </div>
);
