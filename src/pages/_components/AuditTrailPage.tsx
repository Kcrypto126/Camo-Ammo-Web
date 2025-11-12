import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, Search, FileText, Filter } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface AuditTrailPageProps {
  onBack: () => void;
}

export default function AuditTrailPage({ onBack }: AuditTrailPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const logs = useQuery(
    api.audit.searchAuditLogs,
    {
      searchTerm: debouncedSearch || undefined,
      entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
      limit: 200,
    }
  );

  const handleSearch = () => {
    setDebouncedSearch(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getEntityTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type) {
      case "profile":
        return "default";
      case "user":
        return "secondary";
      case "hunt":
      case "friend":
      case "scouting":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Audit Trail</h1>
            <p className="text-xs text-muted-foreground">
              Track all changes made by members and admins
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="border-b bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or member number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>

        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="profile">Profile</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="hunt">Hunt</SelectItem>
              <SelectItem value="friend">Friend</SelectItem>
              <SelectItem value="scouting">Scouting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="p-4 space-y-3">
        {logs === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm || entityTypeFilter !== "all"
                  ? "No audit logs match your search criteria"
                  : "No audit logs found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log._id}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{log.userName}</span>
                          {log.memberNumber && (
                            <Badge variant="outline" className="text-xs text-yellow-500">
                              {log.memberNumber}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {log.userEmail}
                        </p>
                      </div>
                      <Badge variant={getEntityTypeBadgeVariant(log.entityType)}>
                        {log.entityType}
                      </Badge>
                    </div>

                    {/* Action */}
                    <div className="text-sm">
                      <span className="font-medium">{log.action}</span>
                      {log.changes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Changed: {log.changes}
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results count */}
        {logs && logs.length > 0 && (
          <div className="text-center text-sm text-muted-foreground pt-4">
            Showing {logs.length} {logs.length === 1 ? "result" : "results"}
          </div>
        )}
      </div>
    </div>
  );
}
