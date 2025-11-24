import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Eye, Download, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DocumentSigningStatusBadge } from "@/components/DocumentSigningStatusBadge";
import { TruncatedCell } from "@/components/TruncatedCell";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const DocumentsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Fetch all rentals with DocuSign status
  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ["all-docusign-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select(`
          id,
          rental_number,
          created_at,
          docusign_envelope_id,
          document_status,
          envelope_sent_at,
          envelope_completed_at,
          signed_document_id,
          signed_document:signed_document_id (
            id,
            file_url,
            document_name
          ),
          customers:customer_id (id, name, email),
          vehicles:vehicle_id (id, reg, make, model)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Handle resending DocuSign
  const handleResendDocuSign = async (rentalId: string, customerName: string) => {
    setResendingId(rentalId);
    try {
      const { data: envelopeResult, error: envelopeError } = await supabase.functions.invoke('create-docusign-envelope', {
        body: { rentalId }
      });

      if (envelopeError) {
        toast({
          title: "Failed to Send Agreement",
          description: "Could not send the rental agreement for signing.",
          variant: "destructive",
        });
      } else if (envelopeResult && envelopeResult.ok) {
        toast({
          title: "Agreement Sent Successfully",
          description: `Rental agreement sent to ${customerName} for signature.`,
        });
        refetch();
      } else {
        toast({
          title: "Failed to Send Agreement",
          description: envelopeResult?.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Send Agreement",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  // Calculate stats
  const stats = {
    total: documents?.length || 0,
    pending: documents?.filter(d => d.document_status === 'pending').length || 0,
    sent: documents?.filter(d => d.document_status === 'sent' || d.document_status === 'delivered').length || 0,
    signed: documents?.filter(d => d.document_status === 'signed' || d.document_status === 'completed').length || 0,
    declined: documents?.filter(d => d.document_status === 'declined' || d.document_status === 'voided').length || 0,
  };

  if (isLoading) {
    return <div className="p-6">Loading documents...</div>;
  }

  return (
    <div className="space-y-6 p-6 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            All DocuSign rental agreements and their signing status
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent/Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Signed/Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.signed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Declined/Voided</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            All Rental Agreements
          </CardTitle>
          <CardDescription>
            DocuSign status for all rental agreements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Vehicle</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Sent</TableHead>
                    <TableHead className="font-semibold">Completed</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <div className="font-semibold text-foreground">{doc.customers?.name}</div>
                          <div className="text-sm text-muted-foreground">{doc.customers?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TruncatedCell
                          content={`${doc.vehicles?.reg} - ${doc.vehicles?.make} ${doc.vehicles?.model}`}
                          maxLength={25}
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <DocumentSigningStatusBadge status={doc.document_status || 'pending'} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {doc.envelope_sent_at
                          ? format(new Date(doc.envelope_sent_at), "dd/MM/yyyy")
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {doc.envelope_completed_at
                          ? format(new Date(doc.envelope_completed_at), "dd/MM/yyyy")
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {doc.signed_document_id && doc.signed_document?.file_url ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="View signed document"
                                onClick={() => window.open(doc.signed_document.file_url, '_blank')}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Download signed document"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.signed_document.file_url;
                                  link.download = doc.signed_document.document_name || 'rental-agreement.pdf';
                                  link.click();
                                }}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Resend DocuSign"
                                onClick={() => handleResendDocuSign(doc.id, doc.customers?.name)}
                                disabled={resendingId === doc.id}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/rentals/${doc.id}`)}
                            className="hover:bg-primary hover:text-primary-foreground"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description="No rental agreements have been created yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsList;
