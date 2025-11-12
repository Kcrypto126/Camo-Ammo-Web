import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { toast } from "sonner";
import { Upload, User, MapPin, AlertCircle, Target, Crosshair, FileText } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useLoadScript } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps.ts";

const profileSetupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  emergencyContact: z.object({
    name: z.string().min(1, "Emergency contact name is required"),
    phone: z.string().min(1, "Emergency contact phone is required"),
    relationship: z.string().min(1, "Relationship is required"),
  }),
  huntingPreferences: z.array(z.string()).min(1, "Select at least one hunting preference"),
  weaponTypes: z.array(z.string()).min(1, "Select at least one weapon type"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  yearsOfExperience: z.number().min(0, "Years of experience must be 0 or more"),
  favoriteSpecies: z.string().min(1, "Favorite species is required"),
  hobbies: z.string().min(1, "At least one hobby is required"),
});

type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;

const HUNTING_TYPES = [
  { id: "deer", label: "Deer" },
  { id: "elk", label: "Elk" },
  { id: "turkey", label: "Turkey" },
  { id: "waterfowl", label: "Waterfowl" },
  { id: "small_game", label: "Small Game" },
  { id: "predator", label: "Predator" },
];

const WEAPON_TYPES = [
  { id: "rifle", label: "Rifle" },
  { id: "bow", label: "Bow" },
  { id: "shotgun", label: "Shotgun" },
  { id: "muzzle_loader", label: "Muzzle Loader" },
];

const COUNTRIES = [
  "United States",
  "Canada",
  "Mexico",
  "United Kingdom",
  "Australia",
  "New Zealand",
  "South Africa",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const LIBRARIES: ("places")[] = ["places"];

export default function ProfileSetupPage() {
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [photoStorageId, setPhotoStorageId] = useState<Id<"_storage"> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const generateUploadUrl = useMutation(api.profile.generateUploadUrl);
  const updateProfile = useMutation(api.profile.updateProfile);
  
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      huntingPreferences: [],
      weaponTypes: [],
      yearsOfExperience: 0,
    },
  });

  const huntingPreferences = watch("huntingPreferences") || [];
  const weaponTypes = watch("weaponTypes") || [];

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isLoaded && addressInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          types: ["address"],
          componentRestrictions: { country: ["us", "ca", "mx"] },
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.address_components) {
          let streetNumber = "";
          let route = "";
          let city = "";
          let state = "";
          let zipCode = "";
          let country = "";

          place.address_components.forEach((component) => {
            const types = component.types;
            if (types.includes("street_number")) {
              streetNumber = component.long_name;
            }
            if (types.includes("route")) {
              route = component.long_name;
            }
            if (types.includes("locality")) {
              city = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) {
              state = component.short_name;
            }
            if (types.includes("postal_code")) {
              zipCode = component.long_name;
            }
            if (types.includes("country")) {
              country = component.long_name;
            }
          });

          const streetAddress = `${streetNumber} ${route}`.trim();
          
          if (streetAddress) setValue("streetAddress", streetAddress);
          if (city) setValue("city", city);
          if (state) setValue("state", state);
          if (zipCode) setValue("zipCode", zipCode);
          if (country) setValue("country", country);
        }
      });
    }
  }, [isLoaded, setValue]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      setIsUploading(true);

      // Get upload URL
      const postUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();
      setPhotoStorageId(storageId);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setUploadedPhoto(previewUrl);

      toast.success("Photo uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleHuntingPreference = (id: string) => {
    const current = huntingPreferences;
    if (current.includes(id)) {
      setValue("huntingPreferences", current.filter((p) => p !== id));
    } else {
      setValue("huntingPreferences", [...current, id]);
    }
  };

  const toggleWeaponType = (id: string) => {
    const current = weaponTypes;
    if (current.includes(id)) {
      setValue("weaponTypes", current.filter((w) => w !== id));
    } else {
      setValue("weaponTypes", [...current, id]);
    }
  };

  const onSubmit = async (data: ProfileSetupFormData) => {
    if (!photoStorageId) {
      toast.error("Please upload a profile photo");
      return;
    }

    try {
      setIsSaving(true);

      // Parse hobbies from comma-separated string
      const hobbiesArray = data.hobbies
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      await updateProfile({
        name: `${data.firstName} ${data.lastName}`,
        avatar: photoStorageId,
        country: data.country,
        streetAddress: data.streetAddress,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        emergencyContact1: data.emergencyContact,
        huntingPreferences: data.huntingPreferences,
        weaponTypes: data.weaponTypes,
        bio: data.bio,
        yearsOfExperience: data.yearsOfExperience,
        favoriteSpecies: data.favoriteSpecies,
        hobbies: hobbiesArray,
        profileCompleted: true,
      });

      toast.success("Profile setup complete! Welcome to Camo & Ammo!");
    } catch (error) {
      console.error("Profile setup error:", error);
      toast.error("Failed to complete profile setup");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl p-4 pb-24">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Welcome! Please complete your profile to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Profile Photo (Required)
              </CardTitle>
              <CardDescription>
                Upload a clear photo of yourself. This will be visible to other members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-4 border-primary/20">
                  <AvatarImage src={uploadedPhoto || undefined} />
                  <AvatarFallback className="text-4xl">
                    <User className="h-16 w-16" />
                  </AvatarFallback>
                </Avatar>
                <div className="w-full">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  {isUploading && (
                    <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
                  )}
                  {!photoStorageId && (
                    <p className="mt-2 text-sm text-destructive">
                      Profile photo is required
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Name */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Full Name (Required)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address (Required)
              </CardTitle>
              <CardDescription>
                Start typing your address for auto-complete suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select
                  value={watch("country") || ""}
                  onValueChange={(value) => setValue("country", value)}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-sm text-destructive">{errors.country.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  placeholder="123 Main Street"
                  {...register("streetAddress")}
                  ref={(e) => {
                    register("streetAddress").ref(e);
                    if (e) {
                      (addressInputRef as React.MutableRefObject<HTMLInputElement>).current = e;
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Start typing to see address suggestions
                </p>
                {errors.streetAddress && (
                  <p className="text-sm text-destructive">{errors.streetAddress.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Springfield"
                    {...register("city")}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={watch("state") || ""}
                    onValueChange={(value) => setValue("state", value)}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && (
                    <p className="text-sm text-destructive">{errors.state.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  placeholder="32801"
                  {...register("zipCode")}
                />
                {errors.zipCode && (
                  <p className="text-sm text-destructive">{errors.zipCode.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Emergency Contact (Required)
              </CardTitle>
              <CardDescription>
                If you're hunting with a friend on the app, they can access this contact in case of emergency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contact Name *</Label>
                <Input
                  id="emergencyContactName"
                  placeholder="Jane Smith"
                  {...register("emergencyContact.name")}
                />
                {errors.emergencyContact?.name && (
                  <p className="text-sm text-destructive">{errors.emergencyContact.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Phone Number *</Label>
                <Input
                  id="emergencyContactPhone"
                  placeholder="555-123-4567"
                  {...register("emergencyContact.phone")}
                />
                {errors.emergencyContact?.phone && (
                  <p className="text-sm text-destructive">{errors.emergencyContact.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">Relationship *</Label>
                <Input
                  id="emergencyContactRelationship"
                  placeholder="Spouse, Parent, Friend, etc."
                  {...register("emergencyContact.relationship")}
                />
                {errors.emergencyContact?.relationship && (
                  <p className="text-sm text-destructive">{errors.emergencyContact.relationship.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hunting Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Hunting Preferences (Required)
              </CardTitle>
              <CardDescription>Select at least one type of hunting you enjoy.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {HUNTING_TYPES.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.id}
                      checked={huntingPreferences.includes(type.id)}
                      onCheckedChange={() => toggleHuntingPreference(type.id)}
                    />
                    <Label htmlFor={type.id} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.huntingPreferences && (
                <p className="mt-2 text-sm text-destructive">{errors.huntingPreferences.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Weapon Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crosshair className="h-5 w-5" />
                Weapon Types (Required)
              </CardTitle>
              <CardDescription>Select at least one weapon type you use.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {WEAPON_TYPES.map((weapon) => (
                  <div key={weapon.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={weapon.id}
                      checked={weaponTypes.includes(weapon.id)}
                      onCheckedChange={() => toggleWeaponType(weapon.id)}
                    />
                    <Label htmlFor={weapon.id} className="cursor-pointer">
                      {weapon.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.weaponTypes && (
                <p className="mt-2 text-sm text-destructive">{errors.weaponTypes.message}</p>
              )}
            </CardContent>
          </Card>

          {/* About You */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                About You (Required)
              </CardTitle>
              <CardDescription>Tell us about your hunting experience and interests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio * (Minimum 10 characters)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself, your hunting experience, and what you love about hunting..."
                  rows={4}
                  {...register("bio")}
                />
                {errors.bio && (
                  <p className="text-sm text-destructive">{errors.bio.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Years of Hunting Experience *</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  placeholder="5"
                  {...register("yearsOfExperience", { valueAsNumber: true })}
                />
                {errors.yearsOfExperience && (
                  <p className="text-sm text-destructive">{errors.yearsOfExperience.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="favoriteSpecies">Favorite Species *</Label>
                <Input
                  id="favoriteSpecies"
                  placeholder="Whitetail Deer"
                  {...register("favoriteSpecies")}
                />
                {errors.favoriteSpecies && (
                  <p className="text-sm text-destructive">{errors.favoriteSpecies.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="hobbies">Other Hobbies * (comma-separated)</Label>
                <Input
                  id="hobbies"
                  placeholder="Fishing, Camping, Photography"
                  {...register("hobbies")}
                />
                {errors.hobbies && (
                  <p className="text-sm text-destructive">{errors.hobbies.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSaving || isUploading || !photoStorageId}
          >
            {isSaving ? "Setting up your profile..." : "Complete Profile Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
}
