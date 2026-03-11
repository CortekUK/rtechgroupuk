import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Undo2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BorrowingRecord, ReturnVehicleData } from "@/hooks/useVehicleBorrowings";

const returnSchema = z.object({
  actual_return_date: z.date({ required_error: "Return date is required" }),
  notes: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnSchema>;

interface ReturnBorrowedVehicleDialogProps {
  borrowing: BorrowingRecord;
  onReturn: (data: ReturnVehicleData) => Promise<void>;
  isReturning: boolean;
}

export function ReturnBorrowedVehicleDialog({ borrowing, onReturn, isReturning }: ReturnBorrowedVehicleDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      actual_return_date: new Date(),
      notes: "",
    },
  });

  const onSubmit = async (data: ReturnFormData) => {
    try {
      await onReturn({
        borrowing_id: borrowing.id,
        actual_return_date: format(data.actual_return_date, "yyyy-MM-dd"),
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
    if (!newOpen) form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Undo2 className="h-4 w-4" />
          Return Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Return Borrowed Vehicle</DialogTitle>
          <DialogDescription>
            Mark this vehicle as returned from borrowing.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-3 bg-muted/50 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Borrower:</span>
            <span className="font-medium">{borrowing.borrower_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Borrowed:</span>
            <span>{format(new Date(borrowing.borrowed_date), "dd/MM/yyyy")}</span>
          </div>
          {borrowing.expected_return_date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Return:</span>
              <span>{format(new Date(borrowing.expected_return_date), "dd/MM/yyyy")}</span>
            </div>
          )}
          {borrowing.purpose && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purpose:</span>
              <span>{borrowing.purpose}</span>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actual_return_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Return Date *</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes about the return..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isReturning}>
                {isReturning ? "Processing..." : "Confirm Return"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
