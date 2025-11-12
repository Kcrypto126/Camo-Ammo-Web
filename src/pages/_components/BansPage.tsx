import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft, Ban } from "lucide-react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";

interface BansPageProps {
  onBack: () => void;
}

export default function BansPage({ onBack }: BansPageProps) {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Banned Users</h1>
            <p className="text-xs text-muted-foreground">
              Manage user bans and restrictions
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
                  <Ban />
                </EmptyMedia>
                <EmptyTitle>No Banned Users</EmptyTitle>
                <EmptyDescription>
                  No users have been banned from the platform
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
