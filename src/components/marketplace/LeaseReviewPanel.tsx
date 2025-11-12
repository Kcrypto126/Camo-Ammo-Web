import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { MapPinIcon, LandPlotIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface LeaseReviewPanelProps {
  onLeaseClick: (leaseId: Id<"landLeases">) => void;
}

export default function LeaseReviewPanel({ onLeaseClick }: LeaseReviewPanelProps) {
  const pendingLeases = useQuery(api.landLeases.getPendingLeases, {});
  const reviewLease = useMutation(api.landLeases.reviewLease);
  
  const [selectedLease, setSelectedLease] = useState<Id<"landLeases"> | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReviewClick = (leaseId: Id<"landLeases">, action: "approve" | "reject") => {
    setSelectedLease(leaseId);
    setReviewAction(action);
    setRejectionReason("");
  };

  const handleSubmitReview = async () => {
    if (!selectedLease || !reviewAction) return;
    
    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewLease({
        leaseId: selectedLease,
        action: reviewAction,
        rejectionReason: reviewAction === "reject" ? rejectionReason : undefined,
      });
      
      toast.success(reviewAction === "approve" ? "Lease approved successfully" : "Lease rejected");
      setSelectedLease(null);
      setReviewAction(null);
      setRejectionReason("");
    } catch (error) {
      toast.error("Failed to review lease");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingLeases === undefined) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Review Land Leases</h2>
              <p className="text-sm text-muted-foreground">
                {pendingLeases.length} pending approval
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              Admin Review
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 pb-6">
          {pendingLeases.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircleIcon />
                </EmptyMedia>
                <EmptyTitle>All caught up!</EmptyTitle>
                <EmptyDescription>
                  No leases pending review at the moment
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-4">
              {pendingLeases.map((lease) => (
                <Card key={lease._id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1">{lease.title}</CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <MapPinIcon className="h-3 w-3" />
                          {lease.state} • {lease.county} County
                        </CardDescription>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Posted by: {lease.ownerName}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
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
                      <div className="font-semibold text-foreground">
                        ${(lease.price || lease.pricePerYear || 0).toLocaleString()}/year
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(lease.gameTypes || []).slice(0, 4).map((game) => (
                        <span
                          key={game}
                          className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary"
                        >
                          {game}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => onLeaseClick(lease._id)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex items-center gap-1"
                        onClick={() => handleReviewClick(lease._id, "approve")}
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex items-center gap-1"
                        onClick={() => handleReviewClick(lease._id, "reject")}
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={selectedLease !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedLease(null);
          setReviewAction(null);
          setRejectionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Lease
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "This lease will be published to the marketplace."
                : "Please provide a reason for rejecting this lease."}
            </DialogDescription>
          </DialogHeader>
          
          {reviewAction === "reject" && (
            <div className="space-y-2 py-4">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedLease(null);
                setReviewAction(null);
                setRejectionReason("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={reviewAction === "approve" ? "default" : "destructive"}
              onClick={handleSubmitReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : reviewAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
