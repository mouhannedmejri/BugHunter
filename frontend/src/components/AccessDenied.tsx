import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const AccessDenied = () => (
  <div className="flex min-h-[60vh] items-center justify-center p-8">
    <div className="text-center max-w-md">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 mb-4">
        <ShieldX className="h-7 w-7 text-warning" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
      <p className="text-sm text-muted-foreground mb-6">
        You don't have permission to view this page. Contact your administrator if you believe this is an error.
      </p>
      <Button variant="outline" asChild>
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  </div>
);
