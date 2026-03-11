import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useToast } from "@/hooks/use-toast";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

interface IssueRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  creditBalance: number;
}

const createRefundSchema = (maxAmount: number) =>
  z.object({
    amount: z
      .number({ required_error: "Amount is required" })
      .min(0.01, "Minimum refund is £0.01")
      .max(maxAmount, `Cannot exceed credit balance of £${maxAmount.toFixed(2)}`),
    method: z.string().min(1, "Refund method is required"),
    notes: z.string().optional(),
  });

type RefundFormData = z.infer<ReturnType<typeof createRefundSchema>>;

export const IssueRefundDialog = ({
  open,
  onOpenChange,
  customerId,
  creditBalance,
}: IssueRefundDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refundSchema = createRefundSchema(creditBalance);

  const form = useForm<RefundFormData>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      amount: undefined,
      method: "",
      notes: "",
    },
  });

  const onSubmit = async (data: RefundFormData) => {
    setLoading(true);
    try {
      const today = formatInTimeZone(
        toZonedTime(new Date(), "Europe/London"),
        "Europe/London",
        "yyyy-MM-dd"
      );

      // 1. Insert payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        customer_id: customerId,
        amount: data.amount,
        payment_type: "Refund",
        method: data.method,
        payment_date: today,
        status: "Applied",
        remaining_amount: 0,
      });

      if (paymentError) throw paymentError;

      // 2. Insert ledger entry (positive amount reduces credit)
      const { error: ledgerError } = await supabase
        .from("ledger_entries")
        .insert({
          customer_id: customerId,
          type: "Refund",
          category: "Adjustment",
          amount: data.amount,
          entry_date: today,
        });

      if (ledgerError) throw ledgerError;

      toast({
        title: "Refund Issued",
        description: `Refund of £${data.amount.toFixed(2)} has been issued via ${data.method}.`,
      });

      form.reset();
      onOpenChange(false);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["customer-balance"] });
      queryClient.invalidateQueries({ queryKey: ["customer-balance-status"] });
      queryClient.invalidateQueries({ queryKey: ["payments-data"] });
      queryClient.invalidateQueries({
        queryKey: ["customer-payments", customerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer-payment-stats", customerId],
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to issue refund. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Issue Refund</DialogTitle>
          <DialogDescription>
            This customer has £{creditBalance.toFixed(2)} in credit. Issue a
            refund to return some or all of it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Amount *</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="0.00"
                      min={0.01}
                      step={0.01}
                    />
                  </FormControl>
                  <FormDescription>
                    Max: £{creditBalance.toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Method *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Cash, Bank Transfer"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Reason for refund"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Processing..." : "Issue Refund"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
