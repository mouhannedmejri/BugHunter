import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Search, Check, X, ChevronDown, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Verification {
  id: string;
  name: string;
  slug: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  submittedBy: { id: string; username: string; email: string } | null;
  verification: {
    legalName: string;
    registrationNumber: string | null;
    country: string;
    address: string;
    website: string;
    primaryUseCase: string;
    estimatedPrograms: number;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    documents: string[];
    adminNotes: string | null;
  } | null;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  SUBMITTED: 'bg-blue-500',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
};

const AdminVerifications = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('SUBMITTED');
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; org: Verification | null }>({
    open: false,
    org: null,
  });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    org: Verification | null;
    reason: string;
  }>({ open: false, org: null, reason: '' });
  const [notesDialog, setNotesDialog] = useState<{
    open: boolean;
    verification: Verification | null;
    notes: string;
  }>({ open: false, verification: null, notes: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadVerifications();
  }, [activeTab]);

  const loadVerifications = async () => {
    setIsLoading(true);
    try {
      const data = await api.listVerifications(activeTab === 'all' ? undefined : activeTab);
      setVerifications(data);
    } catch (err) {
      toast.error('Failed to load verifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveDialog.org) return;
    try {
      await api.approveVerification(approveDialog.org.id);
      toast.success(`Approved ${approveDialog.org.name}`);
      setApproveDialog({ open: false, org: null });
      loadVerifications();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.org || !rejectDialog.reason.trim()) return;
    try {
      await api.rejectVerification(rejectDialog.org.id, rejectDialog.reason);
      toast.success(`Rejected ${rejectDialog.org.name}`);
      setRejectDialog({ open: false, org: null, reason: '' });
      loadVerifications();
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  const handleSaveNotes = async () => {
    if (!notesDialog.verification?.verification) return;
    try {
      const verificationId =
        notesDialog.verification.verification.id || notesDialog.verification.id;
      await api.updateVerificationNotes(verificationId, notesDialog.notes);
      toast.success('Notes saved');
      setNotesDialog({ open: false, verification: null, notes: '' });
      loadVerifications();
    } catch (err) {
      toast.error('Failed to save notes');
    }
  };

  const filtered = verifications.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (date: string | null) => (date ? new Date(date).toLocaleString() : '-');

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Org Verification Queue</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="SUBMITTED">
            Pending Review ({verifications.filter((v) => v.status === 'SUBMITTED').length})
          </TabsTrigger>
          <TabsTrigger value="APPROVED">
            Approved ({verifications.filter((v) => v.status === 'APPROVED').length})
          </TabsTrigger>
          <TabsTrigger value="REJECTED">
            Rejected ({verifications.filter((v) => v.status === 'REJECTED').length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations..."
            className="pl-9 h-9"
          />
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No verifications found
              </CardContent>
            </Card>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Org Name</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Programs Planned</TableHead>
                    {activeTab === 'SUBMITTED' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <>
                      <TableRow
                        key={v.id}
                        className="cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}
                      >
                        <TableCell>
                          {expandedRow === v.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {v.name}
                          <Badge
                            className={`ml-2 ${statusColors[v.status]} text-white text-[10px]`}
                          >
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{v.submittedBy?.username || '-'}</TableCell>
                        <TableCell>{v.verification?.country || '-'}</TableCell>
                        <TableCell>{formatDate(v.submittedAt)}</TableCell>
                        <TableCell>{v.verification?.estimatedPrograms || '-'}</TableCell>
                        {activeTab === 'SUBMITTED' && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApproveDialog({ open: true, org: v });
                                }}
                              >
                                <Check className="mr-1 h-3 w-3" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRejectDialog({ open: true, org: v, reason: '' });
                                }}
                              >
                                <X className="mr-1 h-3 w-3" /> Reject
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expandedRow === v.id && v.verification && (
                        <TableRow>
                          <TableCell colSpan={activeTab === 'SUBMITTED' ? 7 : 6}>
                            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Legal Name:</span>{' '}
                                  {v.verification.legalName}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Registration #:</span>{' '}
                                  {v.verification.registrationNumber || '-'}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Address:</span>{' '}
                                  {v.verification.address}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Website:</span>{' '}
                                  {v.verification.website || '-'}
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Use Case:</span>
                                  <p className="mt-1 text-muted-foreground">
                                    {v.verification.primaryUseCase}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Contact Name:</span>{' '}
                                  {v.verification.contactName}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Contact Email:</span>{' '}
                                  {v.verification.contactEmail}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Contact Phone:</span>{' '}
                                  {v.verification.contactPhone || '-'}
                                </div>
                              </div>
                              {v.verification.documents.length > 0 && (
                                <div>
                                  <span className="text-muted-foreground">Documents:</span>
                                  <div className="flex gap-2 mt-1">
                                    {v.verification.documents.map((doc, i) => (
                                      <Button key={i} variant="outline" size="sm" asChild>
                                        <a href={doc} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="mr-1 h-3 w-3" /> Document {i + 1}
                                        </a>
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {activeTab === 'SUBMITTED' && (
                                <div className="flex items-center gap-2 pt-2">
                                  <Textarea
                                    placeholder="Internal notes (SA only)"
                                    value={
                                      notesDialog.verification?.id === v.id
                                        ? notesDialog.notes
                                        : v.verification.adminNotes || ''
                                    }
                                    onChange={(e) =>
                                      setNotesDialog({
                                        open: true,
                                        verification: v,
                                        notes: e.target.value,
                                      })
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNotesDialog({
                                        open: true,
                                        verification: v,
                                        notes: v.verification?.adminNotes || '',
                                      });
                                    }}
                                  >
                                    Save Notes
                                  </Button>
                                </div>
                              )}
                              {v.status === 'REJECTED' && v.rejectedReason && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                  <span className="text-red-700 font-medium">
                                    Rejection Reason:
                                  </span>
                                  <p className="text-red-600 text-sm mt-1">{v.rejectedReason}</p>
                                </div>
                              )}
                              {v.approvedAt && (
                                <div className="text-sm text-muted-foreground">
                                  Approved at: {formatDate(v.approvedAt)}
                                </div>
                              )}
                              {v.rejectedAt && (
                                <div className="text-sm text-muted-foreground">
                                  Rejected at: {formatDate(v.rejectedAt)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => setApproveDialog({ open, org: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Organization</DialogTitle>
            <DialogDescription>
              Approve {approveDialog.org?.name}? This will unlock their organization and notify the
              admin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false, org: null })}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog({ open, org: null, reason: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Organization</DialogTitle>
            <DialogDescription>Reason for rejection (shown to org admin)</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
            placeholder="Enter rejection reason..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, org: null, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectDialog.reason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog
        open={notesDialog.open}
        onOpenChange={(open) => setNotesDialog({ open, verification: null, notes: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Internal Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesDialog.notes}
            onChange={(e) => setNotesDialog({ ...notesDialog, notes: e.target.value })}
            placeholder="Add internal notes..."
            className="min-h-[150px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesDialog({ open: false, verification: null, notes: '' })}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerifications;
