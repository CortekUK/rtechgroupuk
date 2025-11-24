import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit, Car, PoundSterling, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const vehicleSchema = z.object({
  reg: z.string().min(1, "Registration number is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ invalid_type_error: "Please enter a valid year" }).min(1900, "Year must be after 1900").max(new Date().getFullYear() + 1, "Year cannot be in the future").optional()
  ),
  colour: z.string().min(1, "Colour is required"),
  fuel_type: z.enum(['Petrol', 'Diesel', 'Hybrid', 'Electric'], { required_error: "Fuel type is required" }),
  // Rental rates (required)
  daily_rate: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ required_error: "Daily rate is required", invalid_type_error: "Please enter a valid daily rate" }).min(1, "Daily rate is required")
  ),
  weekly_rate: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ required_error: "Weekly rate is required", invalid_type_error: "Please enter a valid weekly rate" }).min(1, "Weekly rate is required")
  ),
  monthly_rate: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ required_error: "Monthly rate is required", invalid_type_error: "Please enter a valid monthly rate" }).min(1, "Monthly rate is required")
  ),
  purchase_price: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ invalid_type_error: "Please enter a valid purchase price" }).min(0, "Price must be positive").optional()
  ),
  acquisition_date: z.date(),
  acquisition_type: z.enum(['Purchase', 'Finance']),
  // Finance fields - preprocess null to undefined
  monthly_payment: z.preprocess((val) => val === null ? undefined : val, z.number().min(0).optional()),
  initial_payment: z.preprocess((val) => val === null ? 0 : val, z.number().min(0).default(0)),
  term_months: z.preprocess((val) => val === null ? undefined : val, z.number().int().min(1).optional()),
  balloon: z.preprocess((val) => val === null ? undefined : val, z.number().min(0).optional()),
  finance_start_date: z.date().optional(),
  // MOT & TAX fields
  mot_due_date: z.date().optional(),
  tax_due_date: z.date().optional(),
  // Warranty fields
  warranty_start_date: z.date().optional(),
  warranty_end_date: z.date().optional(),
  // Security fields
  has_tracker: z.boolean().default(false),
  has_remote_immobiliser: z.boolean().default(false),
  security_notes: z.string().optional(),
  // Logbook field
  has_logbook: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.acquisition_type === 'Purchase' && !data.purchase_price) {
      return false;
    }
    return true;
  },
  {
    message: "Purchase price is required for purchased vehicles",
    path: ["purchase_price"],
  }
);

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface Vehicle {
  id: string;
  reg: string;
  make: string;
  model: string;
  year?: number;
  colour: string;
  fuel_type?: string;
  purchase_price?: number;
  acquisition_date: string;
  acquisition_type: string;
  monthly_payment?: number;
  initial_payment?: number;
  term_months?: number;
  balloon?: number;
  finance_start_date?: string;
  mot_due_date?: string;
  tax_due_date?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  has_tracker?: boolean;
  has_remote_immobiliser?: boolean;
  security_notes?: string;
  // Logbook field
  has_logbook?: boolean;
  // Rental rates
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  // Disposal fields
  is_disposed?: boolean;
  disposal_date?: string;
  sale_proceeds?: number;
  disposal_buyer?: string;
  disposal_notes?: string;
  // Photo field
  photo_url?: string;
}

interface EditVehicleDialogProps {
  vehicle: Vehicle;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const EditVehicleDialog = ({ vehicle, open, onOpenChange }: EditVehicleDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      reg: vehicle.reg,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year ?? undefined,
      colour: vehicle.colour,
      fuel_type: vehicle.fuel_type as 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric' | undefined,
      purchase_price: vehicle.purchase_price ?? undefined,
      acquisition_date: new Date(vehicle.acquisition_date),
      acquisition_type: vehicle.acquisition_type as 'Purchase' | 'Finance',
      monthly_payment: vehicle.monthly_payment ?? undefined,
      initial_payment: vehicle.initial_payment ?? 0,
      term_months: vehicle.term_months ?? undefined,
      balloon: vehicle.balloon ?? undefined,
      finance_start_date: vehicle.finance_start_date ? new Date(vehicle.finance_start_date) : undefined,
      mot_due_date: vehicle.mot_due_date ? new Date(vehicle.mot_due_date) : undefined,
      tax_due_date: vehicle.tax_due_date ? new Date(vehicle.tax_due_date) : undefined,
      warranty_start_date: vehicle.warranty_start_date ? new Date(vehicle.warranty_start_date) : undefined,
      warranty_end_date: vehicle.warranty_end_date ? new Date(vehicle.warranty_end_date) : undefined,
      has_tracker: vehicle.has_tracker || false,
      has_remote_immobiliser: vehicle.has_remote_immobiliser || false,
      security_notes: vehicle.security_notes || "",
      has_logbook: vehicle.has_logbook || false,
      daily_rate: vehicle.daily_rate ?? undefined,
      weekly_rate: vehicle.weekly_rate ?? undefined,
      monthly_rate: vehicle.monthly_rate ?? undefined,
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setIsOpen(newOpen);
    }
  };

  const currentOpen = open !== undefined ? open : isOpen;

  const onSubmit = async (data: VehicleFormData) => {
    console.log('=== FORM SUBMITTED ===');
    console.log('Form data:', data);
    setLoading(true);

    try {
      const updateData = {
        reg: data.reg,
        make: data.make,
        model: data.model,
        year: data.year,
        colour: data.colour,
        fuel_type: data.fuel_type,
        acquisition_type: data.acquisition_type,
        acquisition_date: data.acquisition_date.toISOString().split('T')[0],
        // Include purchase price only for purchased vehicles
        ...(data.acquisition_type === 'Purchase' && { purchase_price: data.purchase_price }),
        // Add finance fields only if acquisition type is Finance
        ...(data.acquisition_type === 'Finance' && {
          monthly_payment: data.monthly_payment,
          initial_payment: data.initial_payment,
          term_months: data.term_months,
          balloon: data.balloon,
          finance_start_date: data.finance_start_date?.toISOString().split('T')[0],
        }),
        // Add MOT & TAX dates
        mot_due_date: data.mot_due_date?.toISOString().split('T')[0],
        tax_due_date: data.tax_due_date?.toISOString().split('T')[0],
        // Add warranty dates
        warranty_start_date: data.warranty_start_date?.toISOString().split('T')[0],
        warranty_end_date: data.warranty_end_date?.toISOString().split('T')[0],
        // Security fields
        has_tracker: data.has_tracker,
        has_remote_immobiliser: data.has_remote_immobiliser,
        security_notes: data.security_notes || null,
        has_logbook: data.has_logbook,
        daily_rate: data.daily_rate,
        weekly_rate: data.weekly_rate,
        monthly_rate: data.monthly_rate,
      };

      const { error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq('id', vehicle.id)
        .select();

      if (error) throw error;

      toast({
        title: "Vehicle Updated",
        description: `${data.make} ${data.model} (${data.reg}) has been updated successfully.`,
      });

      handleOpenChange(false);
      
      // Refresh the vehicle data and P&L data
      queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle.id] });
      queryClient.invalidateQueries({ queryKey: ["plEntries", vehicle.id] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
    } catch (error: any) {
      let errorMessage = "Failed to update vehicle. Please try again.";
      
      if (error?.code === '23505' && error?.details?.includes('vehicles_reg_key')) {
        errorMessage = `A vehicle with registration '${data.reg}' already exists. Please use a different registration number.`;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={currentOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Edit Vehicle: {vehicle.reg}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(
            onSubmit,
            (errors) => {
              console.log('=== VALIDATION FAILED ===');
              console.log('Validation errors:', errors);
            }
          )} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Plate Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. AB12 CDE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="acquisition_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acquisition Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ford" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Transit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1900"
                        step="1"
                        placeholder="e.g. 2020"
                        {...field}
                        onKeyDown={(e) => {
                          if (e.key === '.' || e.key === '-' || e.key === 'e') {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[.\-e]/g, '');
                          field.onChange(value === '' ? undefined : parseInt(value, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className={`grid gap-4 ${form.watch("acquisition_type") === "Purchase" ? "grid-cols-2" : "grid-cols-1"}`}>
              <FormField
                control={form.control}
                name="colour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colour</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. White" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("acquisition_type") === "Purchase" && (
                <FormField
                  control={form.control}
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price (£)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter amount"
                          {...field}
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === '-' || e.key === 'e') {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[.\-e]/g, '');
                            field.onChange(value === '' ? undefined : parseInt(value, 10));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="fuel_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuel Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Petrol">Petrol</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rental Rates Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm">Rental Rates *</h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="daily_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily (£) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={field.value ?? ""}
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === '-' || e.key === 'e') {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[.\-e]/g, '');
                            field.onChange(value === '' ? undefined : parseInt(value, 10));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weekly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weekly (£) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={field.value ?? ""}
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === '-' || e.key === 'e') {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[.\-e]/g, '');
                            field.onChange(value === '' ? undefined : parseInt(value, 10));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly (£) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={field.value ?? ""}
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === '-' || e.key === 'e') {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[.\-e]/g, '');
                            field.onChange(value === '' ? undefined : parseInt(value, 10));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* MOT & TAX Due Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mot_due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>MOT Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick MOT due date</span>
                            )}
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
                name="tax_due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>TAX Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick TAX due date</span>
                            )}
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
            </div>

            {/* Warranty Due Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warranty_start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Warranty Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick warranty start</span>
                            )}
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
                name="warranty_end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Warranty End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick warranty end</span>
                            )}
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
            </div>

            <FormField
              control={form.control}
              name="acquisition_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquisition Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select acquisition type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Purchase">Purchase</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Finance Section */}
            {form.watch("acquisition_type") === "Finance" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <PoundSterling className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Finance Information</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthly_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Payment (£) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Monthly payment"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="initial_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Payment (£)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Initial payment"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="term_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term (Months)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Term in months" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="balloon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Balloon Payment (£)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Balloon payment"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="finance_start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Finance Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick finance start date</span>
                              )}
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
              </div>
            )}

            {/* Security Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm">Security Features</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="has_tracker"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>GPS Tracker</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Vehicle has a GPS tracker installed
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="has_remote_immobiliser"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Remote Immobilizer</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Vehicle has remote immobiliser capability
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="security_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional security information..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Logbook Section */}
            <FormField
              control={form.control}
              name="has_logbook"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Has Logbook</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Vehicle has a physical logbook
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Vehicle"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};