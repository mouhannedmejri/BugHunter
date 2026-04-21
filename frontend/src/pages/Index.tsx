import { Link } from "react-router-dom";
import { Bug, Shield, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg animate-fade-in text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Bug className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">BugHuntr</span>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Find bugs.{" "}
          <span className="text-primary">Get rewarded.</span>
        </h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-muted-foreground">
          The platform connecting security researchers with organizations running bug bounty programs.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-12 gap-2 px-8">
            <Link to="/register">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: Bug, label: "Report Vulnerabilities", desc: "Submit detailed reports" },
            { icon: Shield, label: "Responsible Disclosure", desc: "Secure coordinated process" },
            { icon: Trophy, label: "Earn Bounties", desc: "Get paid for your finds" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
