import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CalendarDays, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockAdminPrograms } from "@/lib/admin-mock-data";

const typeColors: Record<string, string> = {
  PUBLIC: "bg-success/10 text-success border-success/20",
  PRIVATE: "bg-warning/10 text-warning border-warning/20",
  CHALLENGE: "bg-primary/10 text-primary border-primary/20",
  CAMPAIGN: "bg-secondary/10 text-secondary border-secondary/20",
};

const AdminProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const program = mockAdminPrograms.find((item) => item.id === id);

  if (!program) {
    return (
      <div className="p-6 space-y-4 animate-fade-in">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/programs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to programs
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Program not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Button asChild variant="outline" size="sm">
        <Link to="/admin/programs">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to programs
        </Link>
      </Button>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{program.title}</h1>
        <p className="text-sm text-muted-foreground">Program ID: {program.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{program.orgName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span>{program.openReports} open reports</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>Created {new Date(program.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${typeColors[program.type] ?? ""}`}>
              {program.type}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {program.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProgramDetail;
