import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  rental_id: string | null;
  customer_id: string;
  vehicle_id: string | null;
  issue_date: string;
  due_date: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  vehicle_reg: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  rental_start_date: string | null;
  rental_end_date: string | null;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceInput {
  rental_id?: string;
  customer_id: string;
  vehicle_id?: string;
  due_date: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  vehicle_reg?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  line_items: InvoiceLineItem[];
  notes?: string;
  tax_rate?: number;
}

// Generate invoice number in format INV-YYYYMM-XXXX
const generateInvoiceNumber = async (): Promise<string> => {
  const yearMonth = format(new Date(), "yyyyMM");
  const prefix = `INV-${yearMonth}-`;

  // Get the latest invoice number for this month
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1);

  let seqNum = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].invoice_number;
    const lastSeq = parseInt(lastNumber.split("-")[2], 10);
    seqNum = lastSeq + 1;
  }

  return `${prefix}${seqNum.toString().padStart(4, "0")}`;
};

export const useInvoices = (customerId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all invoices or invoices for a specific customer
  const {
    data: invoices = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: customerId ? ["invoices", customerId] : ["invoices"],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Parse line_items JSON
      return (data || []).map((invoice) => ({
        ...invoice,
        line_items: typeof invoice.line_items === 'string'
          ? JSON.parse(invoice.line_items)
          : invoice.line_items || [],
      })) as Invoice[];
    },
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      // Calculate totals
      const subtotal = input.line_items.reduce((sum, item) => sum + item.amount, 0);
      const taxRate = input.tax_rate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          rental_id: input.rental_id || null,
          customer_id: input.customer_id,
          vehicle_id: input.vehicle_id || null,
          issue_date: format(new Date(), "yyyy-MM-dd"),
          due_date: input.due_date,
          customer_name: input.customer_name,
          customer_email: input.customer_email || null,
          customer_phone: input.customer_phone || null,
          customer_address: input.customer_address || null,
          vehicle_reg: input.vehicle_reg || null,
          vehicle_make: input.vehicle_make || null,
          vehicle_model: input.vehicle_model || null,
          rental_start_date: input.rental_start_date || null,
          rental_end_date: input.rental_end_date || null,
          line_items: input.line_items,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: "draft",
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        line_items: data.line_items as InvoiceLineItem[],
      } as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Invoice Created",
        description: "Invoice has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice.",
        variant: "destructive",
      });
    },
  });

  // Update invoice status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Invoice Updated",
        description: "Invoice status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice.",
        variant: "destructive",
      });
    },
  });

  // Delete invoice
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Invoice Deleted",
        description: "Invoice has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice.",
        variant: "destructive",
      });
    },
  });

  // Helper to create invoice from rental
  const createInvoiceFromRental = async (rental: {
    id: string;
    customer_id: string;
    vehicle_id: string;
    start_date: string;
    end_date?: string;
    monthly_amount: number;
    customer: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    vehicle: {
      reg: string;
      make: string;
      model: string;
    };
  }) => {
    const lineItems: InvoiceLineItem[] = [
      {
        description: `Monthly Rental Fee\n${rental.vehicle.make} ${rental.vehicle.model} (${rental.vehicle.reg})`,
        quantity: 1,
        unit_price: rental.monthly_amount,
        amount: rental.monthly_amount,
      },
    ];

    return createInvoiceMutation.mutateAsync({
      rental_id: rental.id,
      customer_id: rental.customer_id,
      vehicle_id: rental.vehicle_id,
      due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      customer_name: rental.customer.name,
      customer_email: rental.customer.email,
      customer_phone: rental.customer.phone,
      customer_address: rental.customer.address,
      vehicle_reg: rental.vehicle.reg,
      vehicle_make: rental.vehicle.make,
      vehicle_model: rental.vehicle.model,
      rental_start_date: rental.start_date,
      rental_end_date: rental.end_date,
      line_items: lineItems,
      notes: `Monthly rental fee for ${rental.vehicle.make} ${rental.vehicle.model} (${rental.vehicle.reg})`,
    });
  };

  return {
    invoices,
    isLoading,
    error,
    createInvoice: createInvoiceMutation.mutateAsync,
    createInvoiceFromRental,
    updateStatus: updateStatusMutation.mutate,
    deleteInvoice: deleteInvoiceMutation.mutate,
    isCreating: createInvoiceMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    isDeleting: deleteInvoiceMutation.isPending,
  };
};

// Hook to get a single invoice
export const useInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (error) throw error;
      return {
        ...data,
        line_items: typeof data.line_items === 'string'
          ? JSON.parse(data.line_items)
          : data.line_items || [],
      } as Invoice;
    },
    enabled: !!invoiceId,
  });
};
