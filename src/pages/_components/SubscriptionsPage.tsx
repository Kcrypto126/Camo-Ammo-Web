import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";

interface SubscriptionsPageProps {
  onBack: () => void;
}

export default function SubscriptionsPage({ onBack }: SubscriptionsPageProps) {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Subscriptions</h1>
            <p className="text-xs text-muted-foreground">
              View and manage member subscriptions
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CreditCard />
                </EmptyMedia>
                <EmptyTitle>No Active Subscriptions</EmptyTitle>
                <EmptyDescription>
                  No subscription data available at this time
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
