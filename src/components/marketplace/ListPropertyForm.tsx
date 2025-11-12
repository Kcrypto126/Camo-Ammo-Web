import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ArrowLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLoadScript } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps.ts";

const LIBRARIES: ("places")[] = ["places"];

const COUNTRIES = [
  "United States",
  "Canada",
  "Mexico",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const LAND_TYPES = [
  { id: "pasture", label: "Pasture" },
  { id: "cropland", label: "Crop Land" },
  { id: "forest", label: "Forest" },
  { id: "wetlands", label: "Wetlands" },
  { id: "rivers_streams", label: "Rivers/Streams" },
  { id: "coastal", label: "Coastal" },
  { id: "desert", label: "Desert" },
  { id: "mountains", label: "Mountains" },
];

const HUNTING_TYPES = [
  { id: "big_game", label: "Big Game Hunting" },
  { id: "lease_game", label: "Lease Game" },
  { id: "small_game_furbearer", label: "Small Game & Furbearer Hunting" },
  { id: "trapping", label: "Trapping" },
  { id: "upland_bird", label: "Upland Bird Hunting" },
  { id: "waterfowl", label: "Waterfowl Hunting" },
];

const AMENITIES = [
  { id: "cabin", label: "Cabin" },
  { id: "deerstands", label: "Deerstands" },
  { id: "duck_blinds", label: "Duck Blinds" },
  { id: "camp_site", label: "Camp Site" },
  { id: "electricity_hookup", label: "Electricity Hookup" },
  { id: "pond", label: "Pond" },
  { id: "food_plots", label: "Food Plots" },
  { id: "atv_access", label: "ATV Access" },
];

const PRICE_TYPES = [
  { value: "per_year", label: "Per Year" },
  { value: "per_day", label: "Per Day" },
  { value: "per_week", label: "Per Week" },
  { value: "per_month", label: "Per Month" },
  { value: "per_season", label: "Per Season" },
  { value: "per_person", label: "Per Person" },
];

interface ListPropertyFormProps {
  onBack: () => void;
}

export default function ListPropertyForm({ onBack }: ListPropertyFormProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const createListing = useMutation(api.landLeases.createListing);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Step 1: Location
  const [country, setCountry] = useState("United States");
  const [region, setRegion] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [streetAddressContinued, setStreetAddressContinued] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // Step 2: Property Details
  const [acreage, setAcreage] = useState("");
  const [landTypes, setLandTypes] = useState<string[]>([]);
  const [availableHunting, setAvailableHunting] = useState<string[]>([]);
  const [huntingPartySize, setHuntingPartySize] = useState("");

  // Step 3: Amenities & Description
  const [amenities, setAmenities] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Step 4: Pricing
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState("per_year");
  const [isPriceNegotiable, setIsPriceNegotiable] = useState(false);

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
        if (place?.address_components && place.geometry?.location) {
          let streetNumber = "";
          let route = "";
          let cityValue = "";
          let stateValue = "";
          let zipValue = "";
          let countyValue = "";

          place.address_components.forEach((component) => {
            const types = component.types;
            if (types.includes("street_number")) {
              streetNumber = component.long_name;
            }
            if (types.includes("route")) {
              route = component.long_name;
            }
            if (types.includes("locality")) {
              cityValue = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) {
              stateValue = component.short_name;
            }
            if (types.includes("postal_code")) {
              zipValue = component.long_name;
            }
            if (types.includes("administrative_area_level_2")) {
              countyValue = component.long_name.replace(" County", "");
            }
          });

          const address = `${streetNumber} ${route}`.trim();
          
          if (address) setStreetAddress(address);
          if (cityValue) setCity(cityValue);
          if (stateValue) setState(stateValue);
          if (zipValue) setZipCode(zipValue);
          if (countyValue) setCounty(countyValue);
          
          // Get lat/lng
          const location = place.geometry.location;
          setLat(location.lat());
          setLng(location.lng());
        }
      });
    }
  }, [isLoaded]);

  const validateStep1 = () => {
    if (!country || !streetAddress || !city || !state || !county || !zipCode) {
      toast.error("Please fill in all required location fields");
      return false;
    }
    if (lat === null || lng === null) {
      toast.error("Please select an address from the autocomplete suggestions");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!acreage || parseFloat(acreage) <= 0) {
      toast.error("Please enter a valid acreage");
      return false;
    }
    if (landTypes.length === 0) {
      toast.error("Please select at least one land type");
      return false;
    }
    if (availableHunting.length === 0) {
      toast.error("Please select at least one hunting type");
      return false;
    }
    if (!huntingPartySize || parseInt(huntingPartySize) <= 0) {
      toast.error("Please enter a valid hunting party size");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!description.trim()) {
      toast.error("Please provide a description of your property");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return false;
    }
    if (!priceType) {
      toast.error("Please select a price type");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      onBack();
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;

    setIsSubmitting(true);
    try {
      await createListing({
        country,
        region: region || undefined,
        streetAddress,
        streetAddressContinued: streetAddressContinued || undefined,
        city,
        state,
        county,
        zipCode,
        lat: lat!,
        lng: lng!,
        acreage: parseFloat(acreage),
        landTypes,
        availableHunting,
        huntingPartySize: parseInt(huntingPartySize),
        amenities,
        description,
        price: parseFloat(price),
        priceType,
        isPriceNegotiable,
      });

      toast.success("Property listing submitted for review!");
      onBack();
    } catch (error) {
      toast.error("Failed to submit listing");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">List A Property</h1>
            <p className="text-xs text-muted-foreground">
              Step {step} of 4
            </p>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium ${
                  s < step
                    ? "border-primary bg-primary text-primary-foreground"
                    : s === step
                    ? "border-primary bg-background text-primary"
                    : "border-muted-foreground/30 bg-background text-muted-foreground"
                }`}
              >
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`ml-2 h-0.5 w-12 ${
                    s < step ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Location</span>
          <span>Details</span>
          <span>Amenities</span>
          <span>Pricing</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="space-y-4 p-4">
        {/* Step 1: Location */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Property Location</CardTitle>
              <CardDescription>
                Where is your property located?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region (Optional)</Label>
                <Input
                  id="region"
                  placeholder="e.g., Midwest, Southwest"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  placeholder="Start typing to search..."
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  ref={(e) => {
                    if (e) {
                      (addressInputRef as React.MutableRefObject<HTMLInputElement>).current = e;
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Start typing for address suggestions
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddressContinued">
                  Street Address Continued (Optional)
                </Label>
                <Input
                  id="streetAddressContinued"
                  placeholder="Apt, Suite, Unit, Building, Floor, etc."
                  value={streetAddressContinued}
                  onChange={(e) => setStreetAddressContinued(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="county">County *</Label>
                  <Input
                    id="county"
                    placeholder="County"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code *</Label>
                  <Input
                    id="zipCode"
                    placeholder="Zip Code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleNext} className="w-full">
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Property Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>
                Tell us about your property
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="acreage">How Many Acres? *</Label>
                <Input
                  id="acreage"
                  type="number"
                  placeholder="e.g., 40"
                  value={acreage}
                  onChange={(e) => setAcreage(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Land Types *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {LAND_TYPES.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.id}
                        checked={landTypes.includes(type.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setLandTypes([...landTypes, type.id]);
                          } else {
                            setLandTypes(landTypes.filter((t) => t !== type.id));
                          }
                        }}
                      />
                      <Label htmlFor={type.id} className="cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Available Hunting *</Label>
                <div className="grid grid-cols-1 gap-3">
                  {HUNTING_TYPES.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.id}
                        checked={availableHunting.includes(type.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAvailableHunting([...availableHunting, type.id]);
                          } else {
                            setAvailableHunting(
                              availableHunting.filter((t) => t !== type.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={type.id} className="cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="huntingPartySize">
                  Hunting Party Size Allowed *
                </Label>
                <Input
                  id="huntingPartySize"
                  type="number"
                  placeholder="e.g., 4"
                  value={huntingPartySize}
                  onChange={(e) => setHuntingPartySize(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of hunters allowed at one time
                </p>
              </div>

              <Button onClick={handleNext} className="w-full">
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Amenities & Description */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Amenities & Description</CardTitle>
              <CardDescription>
                What does your property offer?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Available Amenities</Label>
                <div className="grid grid-cols-2 gap-3">
                  {AMENITIES.map((amenity) => (
                    <div key={amenity.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity.id}
                        checked={amenities.includes(amenity.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAmenities([...amenities, amenity.id]);
                          } else {
                            setAmenities(amenities.filter((a) => a !== amenity.id));
                          }
                        }}
                      />
                      <Label htmlFor={amenity.id} className="cursor-pointer">
                        {amenity.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description of the Property *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your property to hunters..."
                  className="min-h-32"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Include details about terrain, wildlife, access, and what makes your
                  property unique
                </p>
              </div>

              <Button onClick={handleNext} className="w-full">
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Pricing */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>
                Set your lease price
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g., 2500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceType">Price Type *</Label>
                <Select value={priceType} onValueChange={setPriceType}>
                  <SelectTrigger id="priceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Is this price negotiable?</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow potential lessees to negotiate the price
                  </p>
                </div>
                <Switch
                  checked={isPriceNegotiable}
                  onCheckedChange={setIsPriceNegotiable}
                />
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Listing"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Your listing will be reviewed by our team before going live
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
