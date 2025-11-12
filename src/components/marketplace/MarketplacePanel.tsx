import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { MapPinIcon, DollarSignIcon, LandPlotIcon, CalendarIcon, EyeIcon, Plus } from "lucide-react";
import ListPropertyForm from "./ListPropertyForm.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface MarketplacePanelProps {
  onLeaseClick: (leaseId: Id<"landLeases">) => void;
}

export default function MarketplacePanel({ onLeaseClick }: MarketplacePanelProps) {
  const [showListForm, setShowListForm] = useState(false);
  const [state, setState] = useState<string | undefined>();
  const [minAcreage, setMinAcreage] = useState<number | undefined>();
  const [maxAcreage, setMaxAcreage] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [gameType, setGameType] = useState<string | undefined>();
  const [leaseTerm, setLeaseTerm] = useState<string | undefined>();

  const leases = useQuery(api.landLeases.browseLeases, {
    state,
    minAcreage,
    maxAcreage,
    maxPrice,
    gameType,
    leaseTerm,
  });

  if (showListForm) {
    return <ListPropertyForm onBack={() => setShowListForm(false)} />;
  }

  if (leases === undefined) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with List Button */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Land Leasing Marketplace</h2>
          <Button onClick={() => setShowListForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            List A Property
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>State</Label>
            <Select value={state} onValueChange={(v) => setState(v === "all" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="Missouri">Missouri</SelectItem>
                <SelectItem value="Arkansas">Arkansas</SelectItem>
                <SelectItem value="Kansas">Kansas</SelectItem>
                <SelectItem value="Iowa">Iowa</SelectItem>
                <SelectItem value="Illinois">Illinois</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Game Type</Label>
            <Select value={gameType} onValueChange={(v) => setGameType(v === "all" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All game</SelectItem>
                <SelectItem value="deer">Deer</SelectItem>
                <SelectItem value="turkey">Turkey</SelectItem>
                <SelectItem value="duck">Waterfowl</SelectItem>
                <SelectItem value="elk">Elk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lease Term</Label>
            <Select value={leaseTerm} onValueChange={(v) => setLeaseTerm(v === "all" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All terms</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Min Acreage</Label>
            <Input
              type="number"
              placeholder="Min acres"
              value={minAcreage ?? ""}
              onChange={(e) => setMinAcreage(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Acreage</Label>
            <Input
              type="number"
              placeholder="Max acres"
              value={maxAcreage ?? ""}
              onChange={(e) => setMaxAcreage(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Price/Year</Label>
            <Input
              type="number"
              placeholder="Max price"
              value={maxPrice ?? ""}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            setState(undefined);
            setMinAcreage(undefined);
            setMaxAcreage(undefined);
            setMaxPrice(undefined);
            setGameType(undefined);
            setLeaseTerm(undefined);
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* Listings */}
      <div className="flex-1 overflow-auto p-4 pb-6">
        {leases.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LandPlotIcon />
              </EmptyMedia>
              <EmptyTitle>No leases found</EmptyTitle>
              <EmptyDescription>
                Try adjusting your filters or check back later for new listings
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {leases.map((lease) => (
              <Card
                key={lease._id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => onLeaseClick(lease._id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{lease.title}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3" />
                        {lease.state}
                        {lease.address && ` • ${lease.address}`}
                      </CardDescription>
                    </div>
                    <div className="ml-2 text-right">
                      <div className="text-lg font-bold text-foreground">
                        ${(lease.price || lease.pricePerYear || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">per year</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {lease.description}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <LandPlotIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{lease.acreage} acres</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{lease.leaseTerm}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{lease.views} views</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(lease.gameTypes || []).slice(0, 3).map((game) => (
                      <span
                        key={game}
                        className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary"
                      >
                        {game}
                      </span>
                    ))}
                    {(lease.gameTypes?.length || 0) > 3 && (
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        +{(lease.gameTypes?.length || 0) - 3} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
