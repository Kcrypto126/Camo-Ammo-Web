import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface OpenTicketsListPageProps {
  onBack: () => void;
  onViewTicket: (userId: Id<"users">, ticketId: Id<"supportTickets">) => void;
}

export default function OpenTicketsListPage({ onBack, onViewTicket }: OpenTicketsListPageProps) {
  const openTickets = useQuery(api.support.getAllTickets, { status: "open" });

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Open Support Tickets</h1>
            <p className="text-xs text-muted-foreground">
              Tickets waiting for your response
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {openTickets === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : openTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No open tickets at this time
              </p>
            </CardContent>
          </Card>
        ) : (
          openTickets.map((ticket) => (
            <Card key={ticket._id} className="cursor-pointer hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{ticket.subject}</p>
                        <Badge variant="destructive" className="text-xs">
                          OPEN
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {ticket.userName || "Unknown"} • {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {ticket.category}
                    </Badge>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>

                  {/* Action Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => onViewTicket(ticket.userId, ticket._id)}
                  >
                    View & Respond
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
