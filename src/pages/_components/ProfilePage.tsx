import { useAuth } from "@/hooks/use-auth.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { NotificationBell } from "@/components/ui/notification-bell.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import {
  Mail,
  LogOut,
  ChevronDown,
  ChevronUp,
  Save,
  UserCircle,
  MapPin,
  AlertCircle,
  Target,
  Crosshair,
  Calendar,
  Fingerprint,
  Shield,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { useBiometricAuth } from "@/hooks/use-biometric-auth.ts";
import { useLoadScript } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps.ts";

const emergencyContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
}).optional();

const profileSchema = z.object({
  name: z.string().optional(),
  country: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  emergencyContact1: emergencyContactSchema,
  emergencyContact2: emergencyContactSchema,
  emergencyContact3: emergencyContactSchema,
  huntingPreferences: z.array(z.string()).optional(),
  weaponTypes: z.array(z.string()).optional(),
  interestedInSpecialEvents: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

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

export default function ProfilePage() {
  const { user, signoutRedirect } = useAuth();
  const profile = useQuery(api.profile.getMyProfile);
  const updateProfile = useMutation(api.profile.updateProfile);
  const { isAvailable, isEnabled, enableBiometric, disableBiometric } = useBiometricAuth();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  
  // Get avatar URL from storage if it's a storage ID
  const avatarUrl = useQuery(
    api.profile.getPhotoUrl,
    profile?.avatar && profile.avatar.startsWith("kg") ? { storageId: profile.avatar as never } : "skip"
  );
  
  const [contact1Open, setContact1Open] = useState(false);
  const [contact2Open, setContact2Open] = useState(false);
  const [contact3Open, setContact3Open] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnablingBiometric, setIsEnablingBiometric] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const userName = profile?.name || user?.profile.name || "Hunter";
  // Use uploaded avatar from database, fallback to OAuth profile URL, then undefined
  const userAvatar = avatarUrl || profile?.avatar || (typeof user?.profile.profileUrl === "string" ? user.profile.profileUrl : undefined);
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      huntingPreferences: [],
      weaponTypes: [],
      interestedInSpecialEvents: false,
    },
  });

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setValue("name", profile.name || "");
      setValue("country", profile.country || "");
      setValue("streetAddress", profile.streetAddress || "");
      setValue("city", profile.city || "");
      setValue("state", profile.state || "");
      setValue("zipCode", profile.zipCode || "");
      
      if (profile.emergencyContact1) {
        setValue("emergencyContact1", profile.emergencyContact1);
        setContact1Open(true);
      }
      if (profile.emergencyContact2) {
        setValue("emergencyContact2", profile.emergencyContact2);
        setContact2Open(true);
      }
      if (profile.emergencyContact3) {
        setValue("emergencyContact3", profile.emergencyContact3);
        setContact3Open(true);
      }
      
      setValue("huntingPreferences", profile.huntingPreferences || []);
      setValue("weaponTypes", profile.weaponTypes || []);
      setValue("interestedInSpecialEvents", profile.interestedInSpecialEvents || false);
    }
  }, [profile, setValue]);

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

  const huntingPreferences = watch("huntingPreferences") || [];
  const weaponTypes = watch("weaponTypes") || [];
  const interestedInSpecialEvents = watch("interestedInSpecialEvents");

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSaving(true);
      console.log("Submitting profile update:", data);
      
      // Filter out empty emergency contacts
      const contact1 = data.emergencyContact1 && data.emergencyContact1.name ? data.emergencyContact1 : undefined;
      const contact2 = data.emergencyContact2 && data.emergencyContact2.name ? data.emergencyContact2 : undefined;
      const contact3 = data.emergencyContact3 && data.emergencyContact3.name ? data.emergencyContact3 : undefined;
      
      await updateProfile({
        name: data.name,
        country: data.country,
        streetAddress: data.streetAddress,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        emergencyContact1: contact1,
        emergencyContact2: contact2,
        emergencyContact3: contact3,
        huntingPreferences: data.huntingPreferences,
        weaponTypes: data.weaponTypes,
        interestedInSpecialEvents: data.interestedInSpecialEvents,
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error("Profile update error:", error);
    } finally {
      setIsSaving(false);
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

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Profile Header */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5">
        <div className="absolute top-4 right-4">
          <NotificationBell />
        </div>
        <div className="absolute -bottom-12 left-4">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="mt-16 px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{userName}</h1>
          {profile?.memberNumber && (
            <Badge variant="outline" className="text-xs text-yellow-500">
              {profile.memberNumber}
            </Badge>
          )}
        </div>
        {user?.profile.email && (
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            {user.profile.email}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 px-4 pb-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              <CardTitle>Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Smith"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle>Address</CardTitle>
            </div>
            <CardDescription>
              Start typing your address for auto-complete suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="streetAddress">Street Address</Label>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Springfield"
                  {...register("city")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
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
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                placeholder="65801"
                {...register("zipCode")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Emergency Contacts</CardTitle>
            </div>
            <CardDescription>Optional - Add up to 3 emergency contacts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contact 1 */}
            <Collapsible open={contact1Open} onOpenChange={setContact1Open}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  Emergency Contact 1
                  {contact1Open ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Jane Smith"
                    {...register("emergencyContact1.name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="555-123-4567"
                    {...register("emergencyContact1.phone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    placeholder="Spouse"
                    {...register("emergencyContact1.relationship")}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Contact 2 */}
            <Collapsible open={contact2Open} onOpenChange={setContact2Open}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  Emergency Contact 2
                  {contact2Open ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Bob Johnson"
                    {...register("emergencyContact2.name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="555-123-4567"
                    {...register("emergencyContact2.phone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    placeholder="Friend"
                    {...register("emergencyContact2.relationship")}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Contact 3 */}
            <Collapsible open={contact3Open} onOpenChange={setContact3Open}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  Emergency Contact 3
                  {contact3Open ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Mary Williams"
                    {...register("emergencyContact3.name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="555-123-4567"
                    {...register("emergencyContact3.phone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    placeholder="Parent"
                    {...register("emergencyContact3.relationship")}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Hunting Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <CardTitle>What do you like to hunt?</CardTitle>
            </div>
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
          </CardContent>
        </Card>

        {/* Weapon Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crosshair className="h-5 w-5" />
              <CardTitle>Weapon Types</CardTitle>
            </div>
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
          </CardContent>
        </Card>

        {/* Special Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Special Hunting Events</CardTitle>
            </div>
            <CardDescription>
              Interested in tournaments, guided hunts, conservation events, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="specialEvents">Interested in special events</Label>
              <Switch
                id="specialEvents"
                checked={interestedInSpecialEvents}
                onCheckedChange={(checked) =>
                  setValue("interestedInSpecialEvents", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      </form>

      <div className="mt-6 space-y-4 px-4 pb-6">
        {/* Security Settings */}
        {isAvailable && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>
                Manage your security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base">Biometric Sign-In</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use fingerprint or Face ID to sign in quickly
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked && user?.profile.sub) {
                      setIsEnablingBiometric(true);
                      const success = await enableBiometric(user.profile.sub);
                      if (success) {
                        toast.success("Biometric authentication enabled!");
                      } else {
                        toast.error("Failed to enable biometric authentication");
                      }
                      setIsEnablingBiometric(false);
                    } else {
                      disableBiometric();
                      toast.success("Biometric authentication disabled");
                    }
                  }}
                  disabled={isEnablingBiometric}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Sign Out */}
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => signoutRedirect()}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
