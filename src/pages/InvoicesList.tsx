import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Eye, Trash2, RefreshCw } from "lucide-react";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { InvoiceDialog } from "@/components/InvoiceDialog";
import { EmptyState } from "@/components/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InvoicesList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const { invoices, isLoading, deleteInvoice, isDeleting } = useInvoices();

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    return (
      searchQuery === "" ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.vehicle_reg?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate summary stats
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const invoiceCount = filteredInvoices.length;

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage and track all invoices</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl">{invoiceCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-2xl">
              £{totalAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            All Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, customer, or vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices found"
              description={
                searchQuery
                  ? "Try adjusting your search"
                  : "Invoices are automatically created when rentals are made"
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell
                        className="font-mono text-sm font-medium"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell onClick={() => handleViewInvoice(invoice)}>
                        {invoice.customer_name}
                      </TableCell>
                      <TableCell onClick={() => handleViewInvoice(invoice)}>
                        {invoice.vehicle_reg || "-"}
                      </TableCell>
                      <TableCell onClick={() => handleViewInvoice(invoice)}>
                        {format(new Date(invoice.issue_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell onClick={() => handleViewInvoice(invoice)}>
                        {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell
                        className="text-right font-medium"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        £{invoice.total_amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete invoice {invoice.invoice_number}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteInvoice(invoice.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Dialog */}
      <InvoiceDialog
        invoice={selectedInvoice}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        companyName="RTech Group UK"
        companyAddress="Vehicle Rental Services"
      />
    </div>
  );
}
