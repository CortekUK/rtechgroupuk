import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Trash2, RotateCcw, Car, Star, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useVehiclePhotos, VehiclePhoto } from "@/hooks/useVehiclePhotos";
import { cn } from "@/lib/utils";
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

interface VehiclePhotoUploadProps {
  vehicleId: string;
  vehicleReg: string;
  currentPhotoUrl?: string;
  onPhotoUpdate?: (photoUrl: string | null) => void;
}

export const VehiclePhotoUpload = ({
  vehicleId,
  vehicleReg,
}: VehiclePhotoUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const {
    photos,
    isLoading,
    isUploading,
    isDeleting,
    uploadMultiplePhotos,
    deletePhoto,
    setPrimaryPhoto,
  } = useVehiclePhotos({
    vehicleId,
    vehicleReg,
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await uploadMultiplePhotos(Array.from(files));

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeletePhoto = async (photo: VehiclePhoto) => {
    await deletePhoto(photo.id, photo.photo_url);
    // Reset selected index if needed
    if (selectedPhotoIndex >= photos.length - 1) {
      setSelectedPhotoIndex(Math.max(0, photos.length - 2));
    }
  };

  const handleSetPrimary = async (photo: VehiclePhoto) => {
    await setPrimaryPhoto(photo.id);
  };

  const handlePrevPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const selectedPhoto = photos[selectedPhotoIndex];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-4 w-4 text-primary" />
            Vehicle Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-48">
            <RotateCcw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-4 w-4 text-primary" />
            Vehicle Photos
            {photos.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({photos.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Photo Display */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md h-64 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 overflow-hidden">
              {photos.length > 0 && selectedPhoto ? (
                <>
                  <img
                    src={selectedPhoto.photo_url}
                    alt={`Photo of ${vehicleReg}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setIsLightboxOpen(true)}
                    onError={(e) => {
                      console.error('Image load error:', e);
                      e.currentTarget.style.display = 'none';
                    }}
                  />

                  {/* Navigation Arrows */}
                  {photos.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                        onClick={handlePrevPhoto}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                        onClick={handleNextPhoto}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* Primary Badge */}
                  {selectedPhoto.is_primary && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Primary
                    </div>
                  )}

                  {/* Photo Counter */}
                  {photos.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 px-2 py-1 rounded text-xs">
                      {selectedPhotoIndex + 1} / {photos.length}
                    </div>
                  )}
                </>
              ) : (
                <div
                  className="flex flex-col items-center justify-center h-full text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={handleUploadClick}
                >
                  <Car className="h-12 w-12 mb-2 opacity-30" />
                  <p className="text-xs font-medium">No photos uploaded</p>
                  <p className="text-xs opacity-75">Click to upload photos of {vehicleReg}</p>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {photos.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "relative w-16 h-16 rounded-md overflow-hidden cursor-pointer border-2 transition-all",
                    index === selectedPhotoIndex
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-muted-foreground/50"
                  )}
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  <img
                    src={photo.photo_url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {photo.is_primary && (
                    <div className="absolute top-0.5 left-0.5">
                      <Star className="h-3 w-3 text-primary fill-primary" />
                    </div>
                  )}
                </div>
              ))}

              {/* Add More Button */}
              <div
                className="w-16 h-16 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                onClick={handleUploadClick}
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading || isDeleting}
              className="flex items-center gap-1.5 text-xs"
            >
              {isUploading ? (
                <RotateCcw className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {photos.length > 0 ? 'Add Photos' : 'Upload Photos'}
            </Button>

            {photos.length > 0 && selectedPhoto && (
              <>
                {!selectedPhoto.is_primary && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetPrimary(selectedPhoto)}
                    disabled={isUploading || isDeleting}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Star className="h-3 w-3" />
                    Set as Primary
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUploading || isDeleting}
                      className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive"
                    >
                      {isDeleting ? (
                        <RotateCcw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this photo? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeletePhoto(selectedPhoto)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>

          {/* Hidden file input - Now accepts multiple files */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload instructions */}
          <div className="text-xs text-muted-foreground/75 text-center">
            <p>JPG, PNG, WebP • Max 5MB per image • Multiple images supported</p>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      {isLightboxOpen && selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevPhoto();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextPhoto();
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          <img
            src={selectedPhoto.photo_url}
            alt={`Photo of ${vehicleReg}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded">
              {selectedPhotoIndex + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </>
  );
};
