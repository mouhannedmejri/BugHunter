import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/StepIndicator";
import { MDEditor } from "@/components/MDEditor";
import { RewardTierTable } from "@/components/RewardTierTable";
import { ScopeAssetTable } from "@/components/ScopeAssetTable";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Severity, Asset, AssetType } from "@/lib/mock-data";

const steps = ["Info", "Policy", "Scope", "Launch"];

const defaultTiers: Record<Severity, { min: number; max: number }> = {
  CRITICAL: { min: 500000, max: 1000000 },
  HIGH: { min: 200000, max: 500000 },
  MEDIUM: { min: 50000, max: 200000 },
  LOW: { min: 10000, max: 50000 },
  INFORMATIONAL: { min: 0, max: 0 },
};

const assetTypes: AssetType[] = ["DOMAIN", "SUBDOMAIN", "IP_RANGE", "MOBILE_APP", "API", "REPOSITORY", "CLOUD", "THIRD_PARTY", "PHYSICAL"];
const allowedMethodsList = ["Web Testing", "API Testing", "Mobile Testing", "Network Testing", "Social Engineering", "Physical Testing"];

const ProgramWizard = () => {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [programType, setProgramType] = useState("PUBLIC");
  const [tags, setTags] = useState("");

  // Step 2
  const [rewardTiers, setRewardTiers] = useState(defaultTiers);
  const [safeHarbor, setSafeHarbor] = useState("");
  const [disclosurePolicy, setDisclosurePolicy] = useState("COORDINATED");
  const [duplicateHandling, setDuplicateHandling] = useState("first");
  const [allowedMethods, setAllowedMethods] = useState<string[]>(["Web Testing", "API Testing"]);
  const [forbiddenActions, setForbiddenActions] = useState("");

  // Step 3
  const [assets, setAssets] = useState<Asset[]>([]);
  const [newAssetType, setNewAssetType] = useState<AssetType>("DOMAIN");
  const [newAssetId, setNewAssetId] = useState("");

  // Step 4
  const [launchDate, setLaunchDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [inviteEmails, setInviteEmails] = useState("");
  const [legalTerms, setLegalTerms] = useState("");

  const addAsset = () => {
    if (!newAssetId.trim()) return;
    setAssets((prev) => [...prev, { id: `new-${Date.now()}`, type: newAssetType, identifier: newAssetId.trim(), inScope: true }]);
    setNewAssetId("");
  };

  const createProgram = useMutation({
    mutationFn: async () => {
      if (!orgSlug) throw new Error("Missing organization");
      if (!title.trim() || !description.trim()) {
        throw new Error("Title and description are required");
      }
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const program = await api.post<{ slug: string }>(
        apiPaths.programs.createForOrganization(orgSlug),
        {
          title: title.trim(),
          description: description.trim(),
          type: programType,
          policy: {
            safeHarbor,
            disclosurePolicy,
            duplicatePolicy: duplicateHandling,
            allowedMethods,
            forbiddenActions: forbiddenActions.trim() || undefined,
          },
          rewardPolicy: rewardTiers,
          legalTerms: legalTerms.trim() || null,
          eligibilityRules: null,
          requiresInvite: programType === "PRIVATE",
          allowPublicDisclosure: disclosurePolicy === "PUBLIC",
          tags: tagList.length ? tagList : undefined,
          launchAt: launchDate ? launchDate.toISOString() : null,
          endAt: endDate ? endDate.toISOString() : null,
        },
      );
      for (const a of assets) {
        const id = a.identifier.trim();
        const wildcardSupport = id.startsWith("*.") || id.startsWith("*.");
        const identifier = id.replace(/^\*\./, "");
        await api.post(apiPaths.programs.assets(program.slug), {
          type: a.type,
          identifier,
          description: a.description ?? null,
          inScope: a.inScope,
          wildcardSupport,
        });
      }
      if (programType === "PRIVATE" && inviteEmails.trim()) {
        const emails = inviteEmails.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
        for (const email of emails) {
          await api.post(apiPaths.programs.invite(program.slug), { kind: "email", email });
        }
      }
      return program.slug;
    },
    onSuccess: (slug) => {
      toast.success("Program created as draft");
      navigate(`/org/${orgSlug}/programs/${slug}/settings`);
    },
  });

  const handleSubmit = () => {
    createProgram.mutate();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Create Program</h1>
      <StepIndicator steps={steps} currentStep={step} />

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Program Title <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Acme Bug Bounty" />
              </div>
              <MDEditor label="Description" value={description} onChange={setDescription} placeholder="Describe your program..." required />
              <div className="space-y-2">
                <Label>Program Type</Label>
                <Select value={programType} onValueChange={setProgramType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["PUBLIC", "PRIVATE", "CAMPAIGN", "CHALLENGE", "EMERGENCY"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="web, api, mobile" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Reward Tiers (USD)</h3>
                <RewardTierTable value={rewardTiers} onChange={setRewardTiers} />
              </div>
              <MDEditor label="Safe Harbor Policy" value={safeHarbor} onChange={setSafeHarbor} placeholder="Describe your safe harbor policy..." />
              <div className="space-y-2">
                <Label>Disclosure Policy</Label>
                <Select value={disclosurePolicy} onValueChange={setDisclosurePolicy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEVER">Never Disclose</SelectItem>
                    <SelectItem value="COORDINATED">Coordinated Disclosure</SelectItem>
                    <SelectItem value="PUBLIC">Public Disclosure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duplicate Handling</Label>
                <RadioGroup value={duplicateHandling} onValueChange={setDuplicateHandling} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem value="first" id="dup-first" /><Label htmlFor="dup-first">First report wins</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="best" id="dup-best" /><Label htmlFor="dup-best">Best report wins</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Allowed Testing Methods</Label>
                <div className="grid grid-cols-2 gap-2">
                  {allowedMethodsList.map((m) => (
                    <div key={m} className="flex items-center gap-2">
                      <Checkbox
                        checked={allowedMethods.includes(m)}
                        onCheckedChange={(c) => setAllowedMethods((prev) => c ? [...prev, m] : prev.filter((x) => x !== m))}
                      />
                      <span className="text-sm">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
              <MDEditor label="Forbidden Actions" value={forbiddenActions} onChange={setForbiddenActions} placeholder="List actions that are not allowed..." />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Scope Assets</h3>
              <div className="flex gap-2">
                <Select value={newAssetType} onValueChange={(v) => setNewAssetType(v as AssetType)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="flex-1" value={newAssetId} onChange={(e) => setNewAssetId(e.target.value)} placeholder="e.g., *.example.com" />
                <Button onClick={addAsset} size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="text-sm text-muted-foreground">Or import from CSV:</div>
              <FileUploadZone files={[]} onFiles={() => toast.info("CSV import: mock")} onRemove={() => {}} accept=".csv,.json" maxSize={2 * 1024 * 1024} />
              <ScopeAssetTable
                assets={assets}
                onToggle={(id) => setAssets((prev) => prev.map((a) => a.id === id ? { ...a, inScope: !a.inScope } : a))}
                onEdit={() => {}}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Launch Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !launchDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {launchDate ? format(launchDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={launchDate} onSelect={setLaunchDate} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "No end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Badge variant="secondary">Status: DRAFT</Badge>
              {programType === "PRIVATE" && (
                <div className="space-y-2">
                  <Label>Invite Researchers (emails, one per line)</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px] resize-y"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder="researcher@example.com"
                  />
                </div>
              )}
              <MDEditor label="Legal Terms" value={legalTerms} onChange={setLegalTerms} placeholder="Terms and conditions..." />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          Previous
        </Button>
        <div className="flex gap-2">
          {step === 3 ? (
            <>
              <Button
                variant="outline"
                disabled={createProgram.isPending}
                onClick={handleSubmit}
              >
                Save as Draft
              </Button>
              <Button onClick={handleSubmit} disabled={createProgram.isPending}>
                {createProgram.isPending ? "Creating…" : "Create Program"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramWizard;
