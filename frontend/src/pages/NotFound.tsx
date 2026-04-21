import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="text-center max-w-lg">
        <p className="text-7xl font-bold text-primary/20 mb-2">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-2">
          The page <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{location.pathname}</code> doesn't exist.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Try searching for what you need, or go back to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild>
            <Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={() => {
            const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            document.dispatchEvent(event);
          }}>
            <Search className="mr-2 h-4 w-4" /> Search (⌘K)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
