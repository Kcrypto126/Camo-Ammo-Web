import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

const leaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  acreage: z.string().min(1, "Acreage is required"),
  state: z.string().min(1, "State is required"),
  county: z.string().min(1, "County is required"),
  address: z.string().optional(),
  lat: z.string().min(1, "Latitude is required"),
  lng: z.string().min(1, "Longitude is required"),
  pricePerYear: z.string().min(1, "Annual price is required"),
  pricePerSeason: z.string().optional(),
  pricePerDay: z.string().optional(),
  leaseTerm: z.string().min(1, "Lease term is required"),
  availableFrom: z.string().min(1, "Start date is required"),
  availableTo: z.string().min(1, "End date is required"),
  maxHunters: z.string().optional(),
  terrain: z.string().optional(),
  rules: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
});

type LeaseFormData = z.infer<typeof leaseSchema>;

interface CreateLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateLeaseDialog({ open, onOpenChange }: CreateLeaseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowedActivities, setAllowedActivities] = useState<string[]>([]);
  const [gameTypes, setGameTypes] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [exclusiveAccess, setExclusiveAccess] = useState(true);

  const createLease = useMutation(api.landLeases.createLease);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: {
      leaseTerm: "annual",
    },
  });

  const onSubmit = async (data: LeaseFormData) => {
    if (allowedActivities.length === 0) {
      toast.error("Please select at least one allowed activity");
      return;
    }
    if (gameTypes.length === 0) {
      toast.error("Please select at least one game type");
      return;
    }

    setIsSubmitting(true);
    try {
      await createLease({
        title: data.title,
        description: data.description,
        acreage: parseFloat(data.acreage),
        state: data.state,
        county: data.county,
        address: data.address,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        pricePerYear: parseFloat(data.pricePerYear),
        pricePerSeason: data.pricePerSeason ? parseFloat(data.pricePerSeason) : undefined,
        pricePerDay: data.pricePerDay ? parseFloat(data.pricePerDay) : undefined,
        leaseTerm: data.leaseTerm,
        availableFrom: new Date(data.availableFrom).getTime(),
        availableTo: new Date(data.availableTo).getTime(),
        allowedActivities,
        gameTypes,
        maxHunters: data.maxHunters ? parseInt(data.maxHunters) : undefined,
        amenities,
        terrain: data.terrain,
        rules: data.rules,
        exclusiveAccess,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
      });

      toast.success("Lease created successfully!");
      reset();
      setAllowedActivities([]);
      setGameTypes([]);
      setAmenities([]);
      setExclusiveAccess(true);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create lease:", error);
      toast.error("Failed to create lease. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActivity = (activity: string) => {
    setAllowedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const toggleGame = (game: string) => {
    setGameTypes((prev) => (prev.includes(game) ? prev.filter((g) => g !== game) : [...prev, game]));
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>List Your Property for Lease</DialogTitle>
          <DialogDescription>Create a listing to lease your hunting land to other hunters</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="title">
                Listing Title <span className="text-destructive">*</span>
              </Label>
              <Input id="title" placeholder="e.g., Premium 200-Acre Deer Hunting Property" {...register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your property, amenities, game population, etc."
                rows={4}
                {...register("description")}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold">Location</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input id="state" placeholder="Missouri" {...register("state")} />
                {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="county">
                  County <span className="text-destructive">*</span>
                </Label>
                <Input id="county" placeholder="Boone" {...register("county")} />
                {errors.county && <p className="text-sm text-destructive">{errors.county.message}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input id="address" placeholder="Near Columbia, MO" {...register("address")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lat">
                  Latitude <span className="text-destructive">*</span>
                </Label>
                <Input id="lat" type="number" step="any" placeholder="38.9517" {...register("lat")} />
                {errors.lat && <p className="text-sm text-destructive">{errors.lat.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lng">
                  Longitude <span className="text-destructive">*</span>
                </Label>
                <Input id="lng" type="number" step="any" placeholder="-92.3341" {...register("lng")} />
                {errors.lng && <p className="text-sm text-destructive">{errors.lng.message}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="acreage">
                  Acreage <span className="text-destructive">*</span>
                </Label>
                <Input id="acreage" type="number" step="any" placeholder="200" {...register("acreage")} />
                {errors.acreage && <p className="text-sm text-destructive">{errors.acreage.message}</p>}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold">Pricing</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leaseTerm">
                  Lease Term <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(value) => setValue("leaseTerm", value)} defaultValue="annual">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
                {errors.leaseTerm && <p className="text-sm text-destructive">{errors.leaseTerm.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerYear">
                  Price Per Year ($) <span className="text-destructive">*</span>
                </Label>
                <Input id="pricePerYear" type="number" placeholder="5000" {...register("pricePerYear")} />
                {errors.pricePerYear && <p className="text-sm text-destructive">{errors.pricePerYear.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerSeason">Price Per Season ($)</Label>
                <Input id="pricePerSeason" type="number" placeholder="2000" {...register("pricePerSeason")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerDay">Price Per Day ($)</Label>
                <Input id="pricePerDay" type="number" placeholder="100" {...register("pricePerDay")} />
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-4">
            <h3 className="font-semibold">Availability</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="availableFrom">
                  Available From <span className="text-destructive">*</span>
                </Label>
                <Input id="availableFrom" type="date" {...register("availableFrom")} />
                {errors.availableFrom && <p className="text-sm text-destructive">{errors.availableFrom.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableTo">
                  Available To <span className="text-destructive">*</span>
                </Label>
                <Input id="availableTo" type="date" {...register("availableTo")} />
                {errors.availableTo && <p className="text-sm text-destructive">{errors.availableTo.message}</p>}
              </div>
            </div>
          </div>

          {/* Hunting Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Hunting Details</h3>

            <div className="space-y-2">
              <Label>
                Allowed Activities <span className="text-destructive">*</span>
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {["deer_hunting", "turkey_hunting", "waterfowl", "small_game", "fishing", "camping"].map(
                  (activity) => (
                    <div key={activity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`activity-${activity}`}
                        checked={allowedActivities.includes(activity)}
                        onCheckedChange={() => toggleActivity(activity)}
                      />
                      <Label htmlFor={`activity-${activity}`} className="cursor-pointer capitalize">
                        {activity.replace(/_/g, " ")}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Game Types <span className="text-destructive">*</span>
              </Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {["deer", "turkey", "duck", "goose", "elk", "rabbit", "squirrel", "dove"].map((game) => (
                  <div key={game} className="flex items-center space-x-2">
                    <Checkbox
                      id={`game-${game}`}
                      checked={gameTypes.includes(game)}
                      onCheckedChange={() => toggleGame(game)}
                    />
                    <Label htmlFor={`game-${game}`} className="cursor-pointer capitalize">
                      {game}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxHunters">Maximum Number of Hunters</Label>
              <Input id="maxHunters" type="number" placeholder="4" {...register("maxHunters")} />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="exclusive" checked={exclusiveAccess} onCheckedChange={(checked) => setExclusiveAccess(checked === true)} />
              <Label htmlFor="exclusive" className="cursor-pointer">
                Exclusive access (only one lessee at a time)
              </Label>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h3 className="font-semibold">Amenities</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "cabin",
                "electricity",
                "water",
                "food_plots",
                "stands",
                "blinds",
                "atv_trails",
                "camping_allowed",
              ].map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={amenities.includes(amenity)}
                    onCheckedChange={() => toggleAmenity(amenity)}
                  />
                  <Label htmlFor={`amenity-${amenity}`} className="cursor-pointer capitalize">
                    {amenity.replace(/_/g, " ")}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Property Features */}
          <div className="space-y-4">
            <h3 className="font-semibold">Property Features</h3>
            <div className="space-y-2">
              <Label htmlFor="terrain">Terrain Type</Label>
              <Select onValueChange={(value) => setValue("terrain", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select terrain type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardwoods">Hardwoods</SelectItem>
                  <SelectItem value="pines">Pines</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="open_fields">Open Fields</SelectItem>
                  <SelectItem value="bottomland">Bottomland</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-4">
            <h3 className="font-semibold">Rules & Restrictions</h3>
            <div className="space-y-2">
              <Label htmlFor="rules">Property Rules</Label>
              <Textarea
                id="rules"
                placeholder="e.g., QDM practices required, no ATVs, steel shot only..."
                rows={3}
                {...register("rules")}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contact Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" type="tel" placeholder="(555) 123-4567" {...register("contactPhone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="landowner@example.com"
                  {...register("contactEmail")}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Listing"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
