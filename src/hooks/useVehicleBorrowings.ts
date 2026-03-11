import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BorrowingRecord {
  id: string;
  vehicle_id: string;
  borrower_name: string;
  customer_id: string | null;
  purpose: string | null;
  notes: string | null;
  borrowed_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  returned_by: string | null;
  created_at: string;
  updated_at: string;
  customers: { name: string } | null;
}

export interface BorrowVehicleData {
  borrower_name: string;
  customer_id?: string | null;
  borrowed_date: string;
  expected_return_date?: string | null;
  purpose?: string | null;
  notes?: string | null;
}

export interface ReturnVehicleData {
  borrowing_id: string;
  actual_return_date: string;
  notes?: string | null;
}

export function useVehicleBorrowings(vehicleId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: borrowings = [], isLoading } = useQuery({
    queryKey: ["vehicleBorrowings", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_borrowings")
        .select("*, customers(name)")
        .eq("vehicle_id", vehicleId)
        .order("borrowed_date", { ascending: false });

      if (error) throw error;
      return data as BorrowingRecord[];
    },
    enabled: !!vehicleId,
  });

  const activeBorrowing = borrowings.find(b => b.actual_return_date === null) || null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["vehicleBorrowings", vehicleId] });
    queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
    queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
    queryClient.invalidateQueries({ queryKey: ["active-borrowings"] });
  };

  const borrowMutation = useMutation({
    mutationFn: async (data: BorrowVehicleData) => {
      const { error: borrowError } = await supabase
        .from("vehicle_borrowings")
        .insert({
          vehicle_id: vehicleId,
          borrower_name: data.borrower_name,
          customer_id: data.customer_id || null,
          borrowed_date: data.borrowed_date,
          expected_return_date: data.expected_return_date || null,
          purpose: data.purpose || null,
          notes: data.notes || null,
        });

      if (borrowError) throw borrowError;

      const { error: statusError } = await supabase
        .from("vehicles")
        .update({ status: "Borrowed" })
        .eq("id", vehicleId);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      invalidateAll();
      toast({
        title: "Vehicle Lent",
        description: "Vehicle has been marked as borrowed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to lend vehicle",
        variant: "destructive",
      });
      console.error("Borrow error:", error);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (data: ReturnVehicleData) => {
      const updateData: Record<string, any> = {
        actual_return_date: data.actual_return_date,
        updated_at: new Date().toISOString(),
      };
      if (data.notes) {
        updateData.returned_by = data.notes;
      }

      const { error: returnError } = await supabase
        .from("vehicle_borrowings")
        .update(updateData)
        .eq("id", data.borrowing_id);

      if (returnError) throw returnError;

      const { error: statusError } = await supabase
        .from("vehicles")
        .update({ status: "Available" })
        .eq("id", vehicleId);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      invalidateAll();
      toast({
        title: "Vehicle Returned",
        description: "Vehicle has been marked as available",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to return vehicle",
        variant: "destructive",
      });
      console.error("Return error:", error);
    },
  });

  return {
    borrowings,
    activeBorrowing,
    isLoading,
    borrowVehicleAsync: borrowMutation.mutateAsync,
    returnVehicleAsync: returnMutation.mutateAsync,
    isBorrowing: borrowMutation.isPending,
    isReturning: returnMutation.isPending,
  };
}
