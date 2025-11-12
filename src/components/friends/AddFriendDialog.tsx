import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Search, UserPlus, Upload, Mail, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddFriendDialog({ open, onOpenChange }: AddFriendDialogProps) {
  const [activeTab, setActiveTab] = useState("search");
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friends</DialogTitle>
          <DialogDescription>
            Search for friends or import your contacts
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="mr-2 h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <SearchTab onClose={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <ImportTab onClose={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SearchTab({ onClose }: { onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [message, setMessage] = useState("");
  
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const searchResults = useQuery(
    api.friends.searchUsers,
    debouncedSearch.trim().length >= 2 ? { searchTerm: debouncedSearch } : "skip"
  );
  
  const sendRequest = useMutation(api.friends.sendFriendRequestById);

  const handleSendRequest = async (userId: Id<"users">) => {
    try {
      const result = await sendRequest({ toUserId: userId, message });
      if (result.friendshipCreated) {
        toast.success("Friend added! They had already sent you a request.");
      } else {
        toast.success("Friend request sent!");
      }
      setSearchTerm("");
      setMessage("");
      setSelectedUserId(null);
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message: errorMessage } = error.data as { code: string; message: string };
        toast.error(errorMessage);
      } else {
        toast.error("Failed to send friend request");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="search">Search by name, username, email, or phone</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Type to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
      )}

      {debouncedSearch.trim().length >= 2 && (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {searchResults === undefined ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : (
              searchResults.map((user) => (
                <Card key={user._id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-medium truncate">{user.name || "Unknown"}</div>
                      {user.username && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">@{user.username}</span>
                        </div>
                      )}
                      {user.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      )}
                      {user.phoneNumber && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{user.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedUserId(user._id)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Confirmation dialog for selected user */}
      <Dialog open={selectedUserId !== null} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Friend Request</DialogTitle>
            <DialogDescription>
              Add an optional message with your request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Let's hunt together!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUserId(null)}>
              Cancel
            </Button>
            <Button onClick={() => selectedUserId && handleSendRequest(selectedUserId)}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImportTab({ onClose }: { onClose: () => void }) {
  const [contacts, setContacts] = useState("");
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [foundUsers, setFoundUsers] = useState<Array<{ _id: Id<"users">; contact: string }>>([]);
  
  const searchResults = useQuery(
    api.friends.searchUsers,
    searchTerm.trim().length >= 2 ? { searchTerm } : "skip"
  );
  const sendRequest = useMutation(api.friends.sendFriendRequestById);

  const handleImport = () => {
    const lines = contacts.split("\n").filter((line) => line.trim());
    
    if (lines.length === 0) {
      toast.error("Please enter at least one contact");
      return;
    }

    // Search for first contact
    setSearchTerm(lines[0].trim());
    setImporting(true);
  };

  // When search results update, process them
  const handleSearchComplete = async () => {
    if (!importing || !searchResults) return;

    const lines = contacts.split("\n").filter((line) => line.trim());
    const currentIndex = foundUsers.length;
    
    if (currentIndex >= lines.length) {
      // Done processing all contacts
      if (foundUsers.length > 0) {
        // Send requests
        let successCount = 0;
        for (const user of foundUsers) {
          try {
            await sendRequest({ toUserId: user._id });
            successCount++;
          } catch (error) {
            console.error(`Failed to send request to ${user.contact}`);
          }
        }
        
        toast.success(`Sent ${successCount} friend request(s)`);
        setContacts("");
        setFoundUsers([]);
        onClose();
      } else {
        toast.error("No matching users found");
      }
      setImporting(false);
      setSearchTerm("");
      return;
    }

    // Process current search result
    if (searchResults.length > 0) {
      setFoundUsers((prev) => [...prev, { _id: searchResults[0]._id, contact: lines[currentIndex] }]);
    }

    // Search for next contact
    if (currentIndex + 1 < lines.length) {
      setSearchTerm(lines[currentIndex + 1].trim());
    } else {
      // Trigger completion
      setTimeout(() => handleSearchComplete(), 100);
    }
  };

  // Trigger when search results change
  useEffect(() => {
    if (importing && searchResults !== undefined && searchTerm) {
      handleSearchComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, importing]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contacts">Paste Contacts</Label>
        <Textarea
          id="contacts"
          placeholder="Enter emails, usernames, or phone numbers (one per line)&#10;Example:&#10;hunter@example.com&#10;@johndoe&#10;555-123-4567"
          value={contacts}
          onChange={(e) => setContacts(e.target.value)}
          rows={8}
        />
        <p className="text-xs text-muted-foreground">
          Enter one contact per line. We'll search for matching users and send friend requests.
        </p>
      </div>

      <Button onClick={handleImport} disabled={importing || !contacts.trim()} className="w-full">
        {importing ? `Importing... (${foundUsers.length} found)` : "Import & Send Requests"}
      </Button>

      <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
        <p className="text-sm font-medium">How to get your contacts:</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Export from your phone's contacts app</li>
          <li>• Copy from your email address book</li>
          <li>• Ask friends for their username or email</li>
        </ul>
      </div>
    </div>
  );
}
