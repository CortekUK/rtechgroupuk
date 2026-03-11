import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, ArrowRightLeft, UserPlus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BorrowVehicleData } from "@/hooks/useVehicleBorrowings";

const borrowSchema = z.object({
  borrower_name: z.string().min(1, "Borrower name is required"),
  customer_id: z.string().optional(),
  borrowed_date: z.date({ required_error: "Borrowed date is required" }),
  expected_return_date: z.date().optional().nullable(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});

type BorrowFormData = z.infer<typeof borrowSchema>;

interface BorrowVehicleDialogProps {
  vehicleReg: string;
  onBorrow: (data: BorrowVehicleData) => Promise<void>;
  isBorrowing: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BorrowVehicleDialog({ vehicleReg, onBorrow, isBorrowing, trigger, open: controlledOpen, onOpenChange }: BorrowVehicleDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: open,
  });

  const form = useForm<BorrowFormData>({
    resolver: zodResolver(borrowSchema),
    defaultValues: {
      borrower_name: "",
      customer_id: undefined,
      borrowed_date: new Date(),
      expected_return_date: null,
      purpose: "",
      notes: "",
    },
  });

  const borrowerName = form.watch("borrower_name");
  const selectedCustomerId = form.watch("customer_id");

  const filteredCustomers = useMemo(() => {
    if (!borrowerName || borrowerName.length < 1) return [];
    const search = borrowerName.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(search)).slice(0, 6);
  }, [borrowerName, customers]);

  const hasExactMatch = useMemo(() => {
    if (!borrowerName) return false;
    return customers.some(c => c.name.toLowerCase() === borrowerName.toLowerCase());
  }, [borrowerName, customers]);

  const showQuickAdd = showSuggestions && borrowerName && borrowerName.length >= 2 && !hasExactMatch && !selectedCustomerId;

  const handleQuickAddCustomer = async () => {
    if (!borrowerName) return;
    setIsCreatingCustomer(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({ name: borrowerName })
        .select("id, name")
        .single();

      if (error) throw error;

      form.setValue("customer_id", data.id);
      form.setValue("borrower_name", data.name);
      setShowSuggestions(false);
      queryClient.invalidateQueries({ queryKey: ["customers-list-simple"] });
      toast({ title: "Customer Created", description: `${data.name} added as a new customer` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create customer", variant: "destructive" });
      console.error("Quick add customer error:", error);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const onSubmit = async (data: BorrowFormData) => {
    try {
      await onBorrow({
        borrower_name: data.borrower_name,
        customer_id: data.customer_id || null,
        borrowed_date: format(data.borrowed_date, "yyyy-MM-dd"),
        expected_return_date: data.expected_return_date
          ? format(data.expected_return_date, "yyyy-MM-dd")
          : null,
        purpose: data.purpose || null,
        notes: data.notes || null,
      });
      setOpen(false);
      form.reset();
    } catch {
      // Error handled by hook toast
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (customer: { id: string; name: string }) => {
    form.setValue("borrower_name", customer.name);
    form.setValue("customer_id", customer.id);
    setShowSuggestions(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Lend Vehicle
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lend Vehicle</DialogTitle>
          <DialogDescription>
            Record a borrowing for {vehicleReg}. No charges will be created.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="borrower_name"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>Borrower *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Type a name..."
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        form.setValue("customer_id", undefined);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      autoComplete="off"
                    />
                  </FormControl>
                  {showSuggestions && (filteredCustomers.length > 0 || showQuickAdd) && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCustomer(customer);
                          }}
                        >
                          {customer.name}
                        </button>
                      ))}
                      {showQuickAdd && (
                        <>
                          {filteredCustomers.length > 0 && <div className="border-t" />}
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 text-primary"
                            disabled={isCreatingCustomer}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleQuickAddCustomer();
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            {isCreatingCustomer ? "Adding..." : `Add "${borrowerName}" as new customer`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {selectedCustomerId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Linked to existing customer
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="borrowed_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Borrowed Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expected_return_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expected Return Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Courtesy car, staff use" {...field} />
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
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isBorrowing}>
                {isBorrowing ? "Processing..." : "Lend Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
