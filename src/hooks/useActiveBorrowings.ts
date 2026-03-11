import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveBorrowing {
  id: string;
  vehicle_id: string;
  borrower_name: string;
}

export const useActiveBorrowings = () => {
  return useQuery({
    queryKey: ["active-borrowings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_borrowings")
        .select("id, vehicle_id, borrower_name")
        .is("actual_return_date", null);

      if (error) throw error;
      return data as ActiveBorrowing[];
    },
  });
};
