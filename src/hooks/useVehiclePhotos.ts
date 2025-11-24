import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  photo_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface UseVehiclePhotosOptions {
  vehicleId: string;
  vehicleReg: string;
}

export const useVehiclePhotos = ({ vehicleId, vehicleReg }: UseVehiclePhotosOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all photos for this vehicle
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["vehicle-photos", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_photos")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as VehiclePhoto[];
    },
    enabled: !!vehicleId,
  });

  const uploadPhoto = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, WebP, etc.)",
        variant: "destructive",
      });
      return false;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return false;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${vehicleId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("vehicle-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("vehicle-photos").getPublicUrl(filePath);

      // Calculate display order (add to end)
      const maxOrder = photos.length > 0
        ? Math.max(...photos.map(p => p.display_order))
        : -1;

      // Insert photo record
      const { error: insertError } = await supabase.from("vehicle_photos").insert({
        vehicle_id: vehicleId,
        photo_url: publicUrl,
        display_order: maxOrder + 1,
        is_primary: photos.length === 0, // First photo is primary
      });

      if (insertError) throw insertError;

      // Update vehicle's photo_url if this is the first/primary photo
      if (photos.length === 0) {
        await supabase
          .from("vehicles")
          .update({ photo_url: publicUrl })
          .eq("id", vehicleId);
      }

      toast({
        title: "Photo Uploaded",
        description: `Photo uploaded successfully for ${vehicleReg}`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-photos-all"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });

      return true;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMultiplePhotos = async (files: File[]) => {
    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        failCount++;
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        failCount++;
        continue;
      }

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${vehicleId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("vehicle-photos")
          .upload(filePath, file);

        if (uploadError) {
          failCount++;
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("vehicle-photos").getPublicUrl(filePath);

        // Get current max order
        const { data: currentPhotos } = await supabase
          .from("vehicle_photos")
          .select("display_order")
          .eq("vehicle_id", vehicleId)
          .order("display_order", { ascending: false })
          .limit(1);

        const maxOrder = currentPhotos && currentPhotos.length > 0
          ? currentPhotos[0].display_order
          : -1;

        const isFirst = maxOrder === -1 && successCount === 0;

        const { error: insertError } = await supabase.from("vehicle_photos").insert({
          vehicle_id: vehicleId,
          photo_url: publicUrl,
          display_order: maxOrder + 1 + successCount,
          is_primary: isFirst,
        });

        if (insertError) {
          failCount++;
          continue;
        }

        // Update vehicle's photo_url if this is the first photo
        if (isFirst) {
          await supabase
            .from("vehicles")
            .update({ photo_url: publicUrl })
            .eq("id", vehicleId);
        }

        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: "Photos Uploaded",
        description: `${successCount} photo${successCount > 1 ? "s" : ""} uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
      });

      queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-photos-all"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } else if (failCount > 0) {
      toast({
        title: "Upload Failed",
        description: "No photos were uploaded. Please check file types and sizes.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
    return successCount > 0;
  };

  const deletePhoto = async (photoId: string, photoUrl: string) => {
    setIsDeleting(true);

    try {
      // Get photo to check if it's primary
      const photoToDelete = photos.find((p) => p.id === photoId);

      // Extract file name from URL
      const urlParts = photoUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from("vehicle-photos")
        .remove([fileName]);

      if (deleteError) {
        console.warn("Storage deletion error:", deleteError);
      }

      // Delete photo record
      const { error: dbError } = await supabase
        .from("vehicle_photos")
        .delete()
        .eq("id", photoId);

      if (dbError) throw dbError;

      // If this was the primary photo, set a new primary
      if (photoToDelete?.is_primary) {
        const remainingPhotos = photos.filter((p) => p.id !== photoId);
        if (remainingPhotos.length > 0) {
          // Set first remaining photo as primary
          await supabase
            .from("vehicle_photos")
            .update({ is_primary: true })
            .eq("id", remainingPhotos[0].id);

          // Update vehicle's photo_url
          await supabase
            .from("vehicles")
            .update({ photo_url: remainingPhotos[0].photo_url })
            .eq("id", vehicleId);
        } else {
          // No photos left, clear vehicle photo_url
          await supabase
            .from("vehicles")
            .update({ photo_url: null })
            .eq("id", vehicleId);
        }
      }

      toast({
        title: "Photo Deleted",
        description: `Photo removed for ${vehicleReg}`,
      });

      queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-photos-all"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });

      return true;
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete photo. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const setPrimaryPhoto = async (photoId: string) => {
    try {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return false;

      // Remove primary from all photos
      await supabase
        .from("vehicle_photos")
        .update({ is_primary: false })
        .eq("vehicle_id", vehicleId);

      // Set new primary
      await supabase
        .from("vehicle_photos")
        .update({ is_primary: true })
        .eq("id", photoId);

      // Update vehicle's photo_url
      await supabase
        .from("vehicles")
        .update({ photo_url: photo.photo_url })
        .eq("id", vehicleId);

      toast({
        title: "Primary Photo Updated",
        description: "Primary photo has been changed",
      });

      queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-photos-all"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });

      return true;
    } catch (error: any) {
      console.error("Set primary error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update primary photo.",
        variant: "destructive",
      });
      return false;
    }
  };

  const reorderPhotos = async (reorderedPhotos: VehiclePhoto[]) => {
    setIsReordering(true);

    try {
      // Update display_order for each photo
      for (let i = 0; i < reorderedPhotos.length; i++) {
        await supabase
          .from("vehicle_photos")
          .update({ display_order: i })
          .eq("id", reorderedPhotos[i].id);
      }

      queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] });

      return true;
    } catch (error: any) {
      console.error("Reorder error:", error);
      toast({
        title: "Reorder Failed",
        description: error.message || "Failed to reorder photos.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsReordering(false);
    }
  };

  const primaryPhoto = photos.find((p) => p.is_primary) || photos[0];

  return {
    photos,
    primaryPhoto,
    isLoading,
    isUploading,
    isDeleting,
    isReordering,
    uploadPhoto,
    uploadMultiplePhotos,
    deletePhoto,
    setPrimaryPhoto,
    reorderPhotos,
  };
};
