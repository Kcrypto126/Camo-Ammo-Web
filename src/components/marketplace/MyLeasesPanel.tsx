import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  LandPlotIcon,
  DollarSignIcon,
  EyeIcon,
  MapPinIcon,
  MessageSquareIcon,
  CheckIcon,
  XIcon,
  SendIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MyLeasesPanelProps {
  onCreateLease: () => void;
}

export default function MyLeasesPanel({ onCreateLease }: MyLeasesPanelProps) {
  const myLeases = useQuery(api.landLeases.getMyLeases);
  const myInquiries = useQuery(api.landLeases.getMyInquiries);
  const mySentInquiries = useQuery(api.landLeases.getMySentInquiries);
  const updateLeaseStatus = useMutation(api.landLeases.updateLeaseStatus);
  const deleteLease = useMutation(api.landLeases.deleteLease);
  const respondToInquiry = useMutation(api.landLeases.respondToInquiry);

  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const handleStatusChange = async (leaseId: string, status: string) => {
    try {
      await updateLeaseStatus({ leaseId: leaseId as never, status });
      toast.success("Lease status updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (leaseId: string) => {
    try {
      await deleteLease({ leaseId: leaseId as never });
      toast.success("Lease deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete lease");
    }
  };

  const handleRespond = async (inquiryId: string, status: "responded" | "accepted" | "declined") => {
    const response = responseText[inquiryId] || "";
    if (!response.trim()) {
      toast.error("Please enter a response");
      return;
    }

    try {
      await respondToInquiry({ inquiryId: inquiryId as never, response, status });
      toast.success("Response sent");
      setResponseText((prev) => {
        const updated = { ...prev };
        delete updated[inquiryId];
        return updated;
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to send response");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Leases</h2>
          <Button onClick={onCreateLease}>List Property</Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="listings">
              My Listings
              {myLeases && myLeases.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {myLeases.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inquiries">
              Inquiries
              {myInquiries &&
                myInquiries.filter((i) => i.status === "pending").length > 0 && (
                  <Badge variant="default" className="ml-2">
                    {myInquiries.filter((i) => i.status === "pending").length}
                  </Badge>
                )}
            </TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>

          {/* My Listings */}
          <TabsContent value="listings" className="mt-4">
            {myLeases === undefined ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : myLeases.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <LandPlotIcon />
                  </EmptyMedia>
                  <EmptyTitle>No listings yet</EmptyTitle>
                  <EmptyDescription>Create your first lease listing to start earning from your land</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={onCreateLease}>
                    List Property
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="space-y-4">
                {myLeases.map((lease) => (
                  <Card key={lease._id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{lease.title}</CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1">
                            <MapPinIcon className="h-3 w-3" />
                            {lease.county}, {lease.state}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={
                            lease.status === "approved" ? "default" : 
                            lease.status === "pending" ? "secondary" : 
                            lease.status === "rejected" ? "destructive" : 
                            "outline"
                          } 
                          className="capitalize"
                        >
                          {lease.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <LandPlotIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{lease.acreage} acres</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                          <span>${(lease.price || lease.pricePerYear || 0).toLocaleString()}/yr</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <EyeIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{lease.views} views</span>
                        </div>
                      </div>

                      <Separator />

                      {lease.status === "rejected" && lease.rejectionReason && (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                          <p className="text-sm font-medium text-destructive">Rejected</p>
                          <p className="mt-1 text-sm text-muted-foreground">{lease.rejectionReason}</p>
                        </div>
                      )}

                      {lease.status === "pending" && (
                        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
                          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                            Pending Admin Approval
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Your listing is being reviewed by our team.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {lease.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(lease._id, "inactive")}>
                            Mark Inactive
                          </Button>
                        )}
                        {lease.status === "inactive" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(lease._id, "approved")}>
                            Mark Active
                          </Button>
                        )}
                        {lease.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(lease._id, "leased")}>
                            Mark as Leased
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this listing?")) {
                              handleDelete(lease._id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Inquiries Received */}
          <TabsContent value="inquiries" className="mt-4">
            {myInquiries === undefined ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : myInquiries.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareIcon />
                  </EmptyMedia>
                  <EmptyTitle>No inquiries yet</EmptyTitle>
                  <EmptyDescription>When hunters inquire about your properties, they will appear here</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-4">
                {myInquiries.map((inquiry) => (
                  <Card key={inquiry._id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{inquiry.leaseTitle}</CardTitle>
                          <CardDescription>
                            From: {inquiry.senderName} • {format(inquiry.createdAt, "MMM d, yyyy")}
                          </CardDescription>
                        </div>
                        <Badge variant={inquiry.status === "pending" ? "default" : "secondary"} className="capitalize">
                          {inquiry.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Message:</p>
                        <p className="mt-1 text-sm text-muted-foreground">{inquiry.message}</p>
                      </div>

                      {inquiry.contactInfo && (
                        <div>
                          <p className="text-sm font-medium">Contact:</p>
                          <p className="mt-1 text-sm text-muted-foreground">{inquiry.contactInfo}</p>
                        </div>
                      )}

                      {(inquiry.startDate || inquiry.endDate) && (
                        <div>
                          <p className="text-sm font-medium">Desired Dates:</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {inquiry.startDate && format(inquiry.startDate, "MMM d, yyyy")} -{" "}
                            {inquiry.endDate && format(inquiry.endDate, "MMM d, yyyy")}
                          </p>
                        </div>
                      )}

                      {inquiry.numberOfHunters && (
                        <div>
                          <p className="text-sm font-medium">Number of Hunters:</p>
                          <p className="mt-1 text-sm text-muted-foreground">{inquiry.numberOfHunters}</p>
                        </div>
                      )}

                      {inquiry.status === "pending" && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Your Response:</p>
                            <Textarea
                              placeholder="Write your response..."
                              rows={3}
                              value={responseText[inquiry._id] || ""}
                              onChange={(e) =>
                                setResponseText((prev) => ({ ...prev, [inquiry._id]: e.target.value }))
                              }
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleRespond(inquiry._id, "accepted")}>
                                <CheckIcon className="mr-1 h-4 w-4" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRespond(inquiry._id, "responded")}
                              >
                                <SendIcon className="mr-1 h-4 w-4" />
                                Respond
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRespond(inquiry._id, "declined")}
                              >
                                <XIcon className="mr-1 h-4 w-4" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </>
                      )}

                      {inquiry.response && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm font-medium">Your Response:</p>
                            <p className="mt-1 text-sm text-muted-foreground">{inquiry.response}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {inquiry.respondedAt && `Sent ${format(inquiry.respondedAt, "MMM d, yyyy h:mm a")}`}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sent Inquiries */}
          <TabsContent value="sent" className="mt-4">
            {mySentInquiries === undefined ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : mySentInquiries.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareIcon />
                  </EmptyMedia>
                  <EmptyTitle>No inquiries sent</EmptyTitle>
                  <EmptyDescription>Your inquiries to landowners will appear here</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-4">
                {mySentInquiries.map((inquiry) => (
                  <Card key={inquiry._id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{inquiry.leaseTitle}</CardTitle>
                          <CardDescription>
                            To: {inquiry.ownerName} • {format(inquiry.createdAt, "MMM d, yyyy")}
                          </CardDescription>
                        </div>
                        <Badge variant={inquiry.status === "pending" ? "secondary" : "default"} className="capitalize">
                          {inquiry.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Your Message:</p>
                        <p className="mt-1 text-sm text-muted-foreground">{inquiry.message}</p>
                      </div>

                      {inquiry.response && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm font-medium">Response from {inquiry.ownerName}:</p>
                            <p className="mt-1 text-sm text-muted-foreground">{inquiry.response}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {inquiry.respondedAt && `Received ${format(inquiry.respondedAt, "MMM d, yyyy h:mm a")}`}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
