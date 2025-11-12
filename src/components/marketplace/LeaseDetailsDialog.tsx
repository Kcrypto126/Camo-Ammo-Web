import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";
import {
  MapPinIcon,
  LandPlotIcon,
  DollarSignIcon,
  CalendarIcon,
  UsersIcon,
  AlertCircleIcon,
  PhoneIcon,
  MailIcon,
  CheckCircle2Icon,
  TreesIcon,
  WavesIcon,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface LeaseDetailsDialogProps {
  leaseId: Id<"landLeases"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInquire: (leaseId: Id<"landLeases">) => void;
}

export default function LeaseDetailsDialog({
  leaseId,
  open,
  onOpenChange,
  onInquire,
}: LeaseDetailsDialogProps) {
  const lease = useQuery(api.landLeases.getLeaseById, leaseId ? { leaseId } : "skip");
  const incrementView = useMutation(api.landLeases.incrementLeaseView);

  useEffect(() => {
    if (open && leaseId) {
      incrementView({ leaseId }).catch(console.error);
    }
  }, [open, leaseId, incrementView]);

  if (!leaseId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {lease === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{lease.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-1 text-base">
                <MapPinIcon className="h-4 w-4" />
                {lease.county} County, {lease.state}
                {lease.address && ` • ${lease.address}`}
              </DialogDescription>
            </DialogHeader>

            {/* Pricing */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-foreground">
                    ${(lease.price || lease.pricePerYear || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">per year</div>
                  {lease.pricePerSeason && (
                    <div className="mt-1 text-sm">
                      ${lease.pricePerSeason.toLocaleString()} per season
                    </div>
                  )}
                  {lease.pricePerDay && (
                    <div className="mt-1 text-sm">${lease.pricePerDay.toLocaleString()} per day</div>
                  )}
                </div>
                <Button size="lg" onClick={() => onInquire(lease._id)}>
                  Send Inquiry
                </Button>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="mb-2 font-semibold">Description</h3>
              <p className="text-sm text-muted-foreground">{lease.description}</p>
            </div>

            <Separator />

            {/* Key Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <LandPlotIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Acreage</div>
                  <div className="font-semibold">{lease.acreage} acres</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Lease Term</div>
                  <div className="font-semibold capitalize">{lease.leaseTerm}</div>
                </div>
              </div>

              {lease.maxHunters && (
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Max Hunters</div>
                    <div className="font-semibold">{lease.maxHunters}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <CheckCircle2Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Access</div>
                  <div className="font-semibold">{lease.exclusiveAccess ? "Exclusive" : "Shared"}</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Availability */}
            {(lease.availableFrom && lease.availableTo) && (
              <div>
                <h3 className="mb-2 font-semibold">Availability</h3>
                <div className="text-sm text-muted-foreground">
                  {new Date(lease.availableFrom).toLocaleDateString()} -{" "}
                  {new Date(lease.availableTo).toLocaleDateString()}
                </div>
              </div>
            )}

            {/* Game Types */}
            {lease.gameTypes && lease.gameTypes.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Available Game</h3>
                <div className="flex flex-wrap gap-2">
                  {lease.gameTypes.map((game) => (
                    <Badge key={game} variant="secondary" className="capitalize">
                      {game}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {lease.allowedActivities && lease.allowedActivities.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Allowed Activities</h3>
                <div className="flex flex-wrap gap-2">
                  {lease.allowedActivities.map((activity) => (
                    <Badge key={activity} variant="outline" className="capitalize">
                      {activity.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {lease.amenities.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Amenities</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {lease.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 text-sm">
                      <CheckCircle2Icon className="h-4 w-4 text-primary" />
                      <span className="capitalize">{amenity.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terrain */}
            {lease.terrain && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <TreesIcon className="h-5 w-5" />
                  Terrain
                </h3>
                <p className="text-sm capitalize text-muted-foreground">{lease.terrain}</p>
              </div>
            )}

            {/* Water Sources */}
            {lease.waterSources && lease.waterSources.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <WavesIcon className="h-5 w-5" />
                  Water Sources
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lease.waterSources.map((water) => (
                    <Badge key={water} variant="secondary" className="capitalize">
                      {water.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            {lease.rules && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-orange-900 dark:text-orange-300">
                  <AlertCircleIcon className="h-5 w-5" />
                  Rules & Restrictions
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-400">{lease.rules}</p>
              </div>
            )}

            <Separator />

            {/* Contact */}
            <div>
              <h3 className="mb-3 font-semibold">Contact Landowner</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Owner:</span>
                  <span className="font-medium">{lease.ownerName}</span>
                </div>
                {lease.contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lease.contactPhone}`} className="text-primary hover:underline">
                      {lease.contactPhone}
                    </a>
                  </div>
                )}
                {lease.contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lease.contactEmail}`} className="text-primary hover:underline">
                      {lease.contactEmail}
                    </a>
                  </div>
                )}
              </div>
              <Button className="mt-4 w-full" onClick={() => onInquire(lease._id)}>
                Send Inquiry
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
