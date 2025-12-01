import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Plus, X, Send, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { AddPaymentDialog } from "@/components/AddPaymentDialog";
import { useToast } from "@/hooks/use-toast";
import { useRentalTotals } from "@/hooks/useRentalLedgerData";
import { useRentalInitialFee } from "@/hooks/useRentalInitialFee";
import { RentalLedger } from "@/components/RentalLedger";
import { ComplianceStatusPanel } from "@/components/ComplianceStatusPanel";
import { CloseRentalDialog } from "@/components/CloseRentalDialog";
import { getRentalStatus } from "@/lib/rentalUtils";

interface Rental {
  id: string;
  rental_number: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  status: string;
  customers: { id: string; name: string };
  vehicles: { id: string; reg: string; make: string; model: string };
}

const RentalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showCloseRental, setShowCloseRental] = useState(false);
  const [sendingDocuSign, setSendingDocuSign] = useState(false);

  const { data: rental, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select(`
          *,
          customers(id, name),
          vehicles(id, reg, make, model)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Rental;
    },
    enabled: !!id,
  });

  const { data: rentalTotals } = useRentalTotals(id);
  const { data: initialFee } = useRentalInitialFee(id);

  // Handle DocuSign resending
  const handleResendDocuSign = async () => {
    if (!rental || !id) return;

    setSendingDocuSign(true);
    try {
      console.log('Resending DocuSign envelope for rental:', id);
      const { data: envelopeResult, error: envelopeError } = await supabase.functions.invoke('create-docusign-envelope', {
        body: { rentalId: id }
      });

      if (envelopeError) {
        console.error('DocuSign envelope creation error:', envelopeError);
        toast({
          title: "Failed to Send Agreement",
          description: "Could not send the rental agreement for signing. Please try again.",
          variant: "destructive",
        });
      } else if (envelopeResult && envelopeResult.ok) {
        console.log('DocuSign envelope created:', envelopeResult.envelopeId);
        toast({
          title: "Agreement Sent Successfully",
          description: "Rental agreement has been sent for signature.",
        });
        // Refresh rental data to get updated docusign status
        queryClient.invalidateQueries({ queryKey: ["rental", id] });
      } else {
        console.error('DocuSign envelope creation failed:', envelopeResult);
        toast({
          title: "Failed to Send Agreement",
          description: envelopeResult?.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (envelopeException) {
      console.error('Exception creating DocuSign envelope:', envelopeException);
      toast({
        title: "Failed to Send Agreement",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSendingDocuSign(false);
    }
  };

  if (isLoading) {
    return <div>Loading rental details...</div>;
  }

  if (!rental) {
    return <div>Rental not found</div>;
  }

  // Use the new totals from allocation-based calculations
  const totalCharges = rentalTotals?.totalCharges || 0;
  const totalPayments = rentalTotals?.totalPayments || 0;
  const outstandingBalance = rentalTotals?.outstanding || 0;

  // Compute the actual status based on dates (same logic as RentalsList)
  const computedStatus = rental ? getRentalStatus(rental.start_date, rental.end_date, rental.status) : rental?.status;


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center pt-[24px] justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/rentals")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Rentals
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Rental Agreement</h1>
            <p className="text-muted-foreground">
              {rental.customers?.name} • {rental.vehicles?.reg}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddPayment(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
          <Button
            variant="outline"
            onClick={handleResendDocuSign}
            disabled={sendingDocuSign}
          >
            <Send className="h-4 w-4 mr-2" />
            {sendingDocuSign ? "Sending..." : "Send DocuSign"}
          </Button>
          {computedStatus === 'Active' && (
            <Button
              variant="outline"
              onClick={() => setShowCloseRental(true)}
            >
              <X className="h-4 w-4 mr-2" />
              Close Rental
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Rental</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this rental for {rental.customers?.name} ({rental.vehicles?.reg})?
                  This action cannot be undone and will remove all associated charges and payment allocations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      // Delete related records first due to foreign key constraints
                      // Delete ledger entries for this rental
                      await supabase.from("ledger_entries").delete().eq("rental_id", rental.id);
                      // Delete reminder related tables
                      await supabase.from("reminder_actions").delete().eq("rental_id", rental.id);
                      await supabase.from("reminder_emails").delete().eq("rental_id", rental.id);
                      await supabase.from("reminder_events").delete().eq("rental_id", rental.id);
                      await supabase.from("reminder_logs").delete().eq("rental_id", rental.id);
                      await supabase.from("reminders").delete().eq("rental_id", rental.id);
                      // Delete payment applications for this rental
                      await supabase.from("payment_applications").delete().eq("rental_id", rental.id);
                      // Delete charges for this rental
                      await supabase.from("charges").delete().eq("rental_id", rental.id);
                      // Delete payments for this rental
                      await supabase.from("payments").delete().eq("rental_id", rental.id);
                      // Delete invoices for this rental
                      await supabase.from("invoices").delete().eq("rental_id", rental.id);
                      // Finally delete the rental
                      const { error } = await supabase.from("rentals").delete().eq("id", rental.id);
                      if (error) throw error;

                      // Update vehicle status back to Available
                      await supabase
                        .from("vehicles")
                        .update({ status: "Available" })
                        .eq("id", rental.vehicles?.id);

                      toast({
                        title: "Rental Deleted",
                        description: "The rental has been deleted successfully.",
                      });

                      // Invalidate queries and navigate back
                      queryClient.invalidateQueries({ queryKey: ["rentals-list"] });
                      queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
                      navigate("/rentals");
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to delete rental",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Delete Rental
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Rental Summary */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              £{totalCharges.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              £{totalPayments.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              £{outstandingBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={computedStatus === 'Active' ? 'default' : computedStatus === 'Upcoming' ? 'outline' : 'secondary'}
              className="text-lg px-3 py-1"
            >
              {computedStatus}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Rental Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rental Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{rental.customers?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vehicle</p>
              <p className="font-medium">
                {rental.vehicles?.reg} ({rental.vehicles?.make} {rental.vehicles?.model})
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{new Date(rental.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="font-medium">{new Date(rental.end_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Amount</p>
              <p className="font-medium">£{Number(rental.monthly_amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Initial Fee</p>
              <p className="font-medium">
                {initialFee ? `£${Number(initialFee.amount).toLocaleString()}` : 'No Initial Fee'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Ledger */}
      {id && <RentalLedger rentalId={id} />}

      {/* Payment Status Compliance */}
      {id && (
        <ComplianceStatusPanel
          objectType="Rental"
          objectId={id}
          title="Payment Reminders"
        />
      )}

      {/* Add Payment Dialog */}
      {rental && (
        <AddPaymentDialog
          open={showAddPayment}
          onOpenChange={setShowAddPayment}
          customer_id={rental.customers?.id}
          vehicle_id={rental.vehicles?.id}
        />
      )}

      {/* Close Rental Dialog */}
      {rental && (
        <CloseRentalDialog
          open={showCloseRental}
          onOpenChange={setShowCloseRental}
          rental={{
            id: rental.id,
            rental_number: rental.rental_number,
            customer: {
              id: rental.customers.id,
              name: rental.customers.name,
            },
            vehicle: {
              id: rental.vehicles.id,
              reg: rental.vehicles.reg,
              make: rental.vehicles.make,
              model: rental.vehicles.model,
            },
            start_date: rental.start_date,
            monthly_amount: rental.monthly_amount,
          }}
        />
      )}
    </div>
  );
};

export default RentalDetail;
