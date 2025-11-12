import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ArrowLeft, MessageSquare, Send, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

interface ContactSupportPageProps {
  onBack: () => void;
}

export default function ContactSupportPage({ onBack }: ContactSupportPageProps) {
  const tickets = useQuery(api.support.getMyTickets);
  const profile = useQuery(api.profile.getMyProfile, {});
  const createTicket = useMutation(api.support.createTicket);

  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !category) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createTicket({
        subject: subject.trim(),
        message: message.trim(),
        category,
      });
      toast.success("Support ticket submitted successfully");
      setShowNewTicketDialog(false);
      setSubject("");
      setMessage("");
      setCategory("");
    } catch (error) {
      toast.error("Failed to submit ticket");
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === "resolved" || status === "closed") return "secondary";
    if (status === "in_progress") return "default";
    return "destructive";
  };

  const getStatusIcon = (status: string) => {
    if (status === "resolved" || status === "closed") return <CheckCircle2 className="h-3 w-3" />;
    if (status === "in_progress") return <Clock className="h-3 w-3" />;
    return <AlertCircle className="h-3 w-3" />;
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Contact Support</h1>
              <p className="text-xs text-muted-foreground">
                Get help from our support team
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowNewTicketDialog(true)}>
            <Send className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Card */}
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">How can we help?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submit a support ticket and our team will get back to you as soon as possible.
                  We typically respond within 24-48 hours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">My Tickets</h2>
          {tickets === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No support tickets yet
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowNewTicketDialog(true)}
                >
                  Create your first ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket._id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{ticket.subject}</p>
                          <Badge variant={getStatusBadgeVariant(ticket.status)} className="text-xs">
                            <span className="flex items-center gap-1">
                              {getStatusIcon(ticket.status)}
                              {ticket.status.replace("_", " ").toUpperCase()}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ticket.category}
                      </Badge>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-muted-foreground">{ticket.message}</p>

                    {/* Admin Response */}
                    {ticket.adminResponse && (
                      <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                        <p className="text-xs font-medium text-primary">Support Team Response:</p>
                        <p className="text-sm">{ticket.adminResponse}</p>
                        {ticket.respondedAt && (
                          <p className="text-xs text-muted-foreground">
                            Responded on {format(new Date(ticket.respondedAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Tell us about your issue and we'll help you resolve it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input
                value={profile?.name || "Loading..."}
                disabled
                className="bg-muted"
              />
              {profile?.memberNumber && (
                <Badge variant="outline" className="text-xs text-yellow-500">
                  {profile.memberNumber}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="account">Account Issue</SelectItem>
                  <SelectItem value="billing">Billing Question</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Please provide detailed information about your issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTicketDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
