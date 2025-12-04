import { useRef } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { Invoice, InvoiceLineItem } from "@/hooks/useInvoices";

interface InvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName?: string;
  companyAddress?: string;
}

export const InvoiceDialog = ({
  invoice,
  open,
  onOpenChange,
  companyName = "Vehicle Rental Services",
  companyAddress = "RTech Group UK",
}: InvoiceDialogProps) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.5;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e5e5;
            }
            .company-name {
              font-size: 24px;
              font-weight: 600;
              color: #0d9488;
            }
            .company-address {
              color: #666;
              margin-top: 4px;
            }
            .invoice-title {
              text-align: right;
            }
            .invoice-title h1 {
              font-size: 28px;
              color: #1a1a1a;
              margin-bottom: 8px;
            }
            .invoice-number {
              font-size: 14px;
              color: #666;
            }
            .bill-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .bill-to, .invoice-details {
              width: 48%;
            }
            .section-title {
              font-size: 12px;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 8px;
              font-weight: 600;
            }
            .customer-name {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .customer-info {
              color: #666;
              font-size: 14px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 14px;
            }
            .detail-label {
              color: #666;
            }
            .detail-value {
              font-weight: 500;
            }
            .rental-info {
              background: #f8f9fa;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .rental-info-title {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .rental-details {
              display: flex;
              justify-content: space-between;
            }
            .rental-item {
              font-size: 14px;
            }
            .rental-item-label {
              color: #666;
              display: block;
              margin-bottom: 2px;
            }
            .rental-item-value {
              font-weight: 500;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .items-table th {
              background: #f8f9fa;
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
              color: #666;
              border-bottom: 1px solid #e5e5e5;
            }
            .items-table th:last-child {
              text-align: right;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e5e5e5;
              font-size: 14px;
            }
            .items-table td:last-child {
              text-align: right;
              font-weight: 500;
            }
            .description-cell {
              white-space: pre-line;
            }
            .totals {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 30px;
            }
            .totals-table {
              width: 300px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .total-row.grand-total {
              border-top: 2px solid #1a1a1a;
              margin-top: 8px;
              padding-top: 16px;
              font-size: 20px;
              font-weight: 600;
              color: #0d9488;
            }
            .notes {
              background: #f8f9fa;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .notes-title {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .notes-content {
              font-size: 14px;
              color: #666;
            }
            .footer {
              text-align: center;
              padding-top: 30px;
              border-top: 1px solid #e5e5e5;
              color: #666;
              font-size: 12px;
            }
            .footer p {
              margin-bottom: 4px;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div>
                <div class="company-name">${companyName}</div>
                <div class="company-address">${companyAddress}</div>
              </div>
              <div class="invoice-title">
                <h1>Invoice</h1>
                <div class="invoice-number">${invoice.invoice_number}</div>
              </div>
            </div>

            <div class="bill-section">
              <div class="bill-to">
                <div class="section-title">Bill To:</div>
                <div class="customer-name">${invoice.customer_name}</div>
                <div class="customer-info">
                  ${invoice.customer_email || ''}${invoice.customer_email && invoice.customer_phone ? '<br>' : ''}
                  ${invoice.customer_phone || ''}${invoice.customer_address ? '<br>' + invoice.customer_address : ''}
                </div>
              </div>
              <div class="invoice-details">
                <div class="section-title">Invoice Details:</div>
                <div class="detail-row">
                  <span class="detail-label">Invoice #:</span>
                  <span class="detail-value">${invoice.invoice_number}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${format(new Date(invoice.issue_date), "d MMMM yyyy")}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Due Date:</span>
                  <span class="detail-value">${format(new Date(invoice.due_date), "d MMMM yyyy")}</span>
                </div>
              </div>
            </div>

            ${invoice.vehicle_reg ? `
            <div class="rental-info">
              <div class="rental-info-title">Rental Information</div>
              <div class="rental-details">
                <div class="rental-item">
                  <span class="rental-item-label">Vehicle:</span>
                  <span class="rental-item-value">${invoice.vehicle_make || ''} ${invoice.vehicle_model || ''}</span>
                  <br><span style="color: #666; font-size: 12px;">Reg: ${invoice.vehicle_reg}</span>
                </div>
                ${invoice.rental_start_date ? `
                <div class="rental-item">
                  <span class="rental-item-label">Rental Period:</span>
                  <span class="rental-item-value">${format(new Date(invoice.rental_start_date), "d MMM yyyy")} - ${invoice.rental_end_date ? format(new Date(invoice.rental_end_date), "d MMM yyyy") : 'Ongoing'}</span>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}

            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(invoice.line_items as InvoiceLineItem[]).map(item => `
                  <tr>
                    <td class="description-cell">${item.description}</td>
                    <td>£${item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-table">
                <div class="total-row grand-total">
                  <span>Total</span>
                  <span>£${invoice.total_amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            ${invoice.notes ? `
            <div class="notes">
              <div class="notes-title">Notes:</div>
              <div class="notes-content">${invoice.notes}</div>
            </div>
            ` : ''}

            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="font-size: 11px; color: #999;">This is a computer-generated invoice.</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Invoice Preview</DialogTitle>
        </DialogHeader>

        <div ref={invoiceRef} className="bg-white p-6 rounded-lg border text-black">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-black pb-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-black">{companyName}</h2>
              <p className="text-sm text-black">{companyAddress}</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-black">Invoice</h3>
              <p className="text-sm text-black">{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Bill To & Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h4 className="text-xs uppercase text-black font-semibold mb-2">Bill To:</h4>
              <p className="font-semibold text-black">{invoice.customer_name}</p>
              {invoice.customer_email && <p className="text-sm text-black">{invoice.customer_email}</p>}
              {invoice.customer_phone && <p className="text-sm text-black">{invoice.customer_phone}</p>}
              {invoice.customer_address && <p className="text-sm text-black">{invoice.customer_address}</p>}
            </div>
            <div>
              <h4 className="text-xs uppercase text-black font-semibold mb-2">Invoice Details:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-black">Invoice #:</span>
                  <span className="font-medium text-black">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Date:</span>
                  <span className="text-black">{format(new Date(invoice.issue_date), "d MMMM yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Due Date:</span>
                  <span className="text-black">{format(new Date(invoice.due_date), "d MMMM yyyy")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rental Information */}
          {invoice.vehicle_reg && (
            <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-3 text-black">Rental Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-black block">Vehicle:</span>
                  <span className="font-medium text-black">{invoice.vehicle_make} {invoice.vehicle_model}</span>
                  <br />
                  <span className="text-xs text-black">Reg: {invoice.vehicle_reg}</span>
                </div>
                {invoice.rental_start_date && (
                  <div>
                    <span className="text-black block">Rental Period:</span>
                    <span className="font-medium text-black">
                      {format(new Date(invoice.rental_start_date), "d MMM yyyy")} - {invoice.rental_end_date ? format(new Date(invoice.rental_end_date), "d MMM yyyy") : "Ongoing"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Line Items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-3 px-2 text-xs uppercase text-black font-semibold">Description</th>
                <th className="text-right py-3 px-2 text-xs uppercase text-black font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.line_items as InvoiceLineItem[]).map((item, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="py-3 px-2 text-sm whitespace-pre-line text-black">{item.description}</td>
                  <td className="py-3 px-2 text-sm text-right font-medium text-black">
                    £{item.amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-3 border-t-2 border-black font-bold text-lg text-black">
                <span>Total</span>
                <span>£{invoice.total_amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-sm mb-2 text-black">Notes:</h4>
              <p className="text-sm text-black">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t border-black pt-4">
            <p className="text-sm font-medium text-black">Thank you for your business!</p>
            <p className="text-xs text-black">This is a computer-generated invoice.</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-primary">
            <Printer className="h-4 w-4 mr-2" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
