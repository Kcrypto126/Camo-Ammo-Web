import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ActiveViewers } from "@/components/ui/active-viewers.tsx";
import {
  ArrowLeft,
  Shield,
  UserCog,
  User,
  AlertCircle,
  Ban,
  Pause,
  Trash2,
  Phone,
  MessageSquare,
  FileText,
  Upload,
  Download,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  CheckCircle2,
  Send,
  Paperclip,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface ViewMemberProfilePageProps {
  userId: Id<"users">;
  onBack: () => void;
}

function FileDownloadButton({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.roles.getMemberFileUrl, { storageId });
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={() => {
        if (url) window.open(url, "_blank");
      }}
      disabled={!url}
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}

function AttachmentDownloadButton({ storageId, fileName, fileSize }: { storageId: Id<"_storage">; fileName: string; fileSize: number }) {
  const url = useQuery(api.support.getAttachmentUrl, { storageId });
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-auto justify-start gap-2 px-3 py-2"
      onClick={() => {
        if (url) window.open(url, "_blank");
      }}
      disabled={!url}
    >
      <FileText className="h-4 w-4 flex-none" />
      <div className="flex-1 text-left min-w-0">
        <p className="text-xs font-medium truncate">{fileName}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
      </div>
      <Download className="h-3 w-3 flex-none" />
    </Button>
  );
}

function TicketRepliesSection({ ticketId }: { ticketId: Id<"supportTickets"> }) {
  const replies = useQuery(api.support.getTicketReplies, { ticketId });

  if (replies === undefined) {
    return <Skeleton className="h-20" />;
  }

  if (replies.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No replies yet
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div
          key={reply._id}
          className={`rounded-lg border p-3 space-y-2 ${
            reply.isAdminReply ? "bg-primary/5 border-primary/20" : "bg-muted/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Badge variant={reply.isAdminReply ? "default" : "outline"} className="text-xs">
              {reply.isAdminReply ? "Support Team" : "Member"}
            </Badge>
            <p className="text-xs font-medium">{reply.userName}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(reply.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
          {reply.attachments && reply.attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Attachments:</p>
              <div className="grid gap-2">
                {reply.attachments.map((attachment, index) => (
                  <AttachmentDownloadButton
                    key={index}
                    storageId={attachment.storageId}
                    fileName={attachment.fileName}
                    fileSize={attachment.fileSize}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ViewMemberProfilePage({ userId, onBack }: ViewMemberProfilePageProps) {
  const user = useQuery(api.roles.getUserById, { userId });
  const notes = useQuery(api.roles.getAdminNotes, { userId });
  const callLogs = useQuery(api.roles.getCallLogs, { userId });
  const tickets = useQuery(api.support.getUserTickets, { userId });
  const files = useQuery(api.roles.getMemberFiles, { userId });
  const forumActivity = useQuery(api.forums.getUserForumActivity, { userId });
  const myRole = useQuery(api.roles.getMyRole);

  // Get avatar URL from storage if it's a storage ID
  const avatarUrl = useQuery(
    api.profile.getPhotoUrl,
    user?.avatar && user.avatar.startsWith("kg") ? { storageId: user.avatar as never } : "skip"
  );

  const updateStatus = useMutation(api.roles.updateAccountStatus);
  const changeRole = useMutation(api.roles.changeUserRole);
  const addNote = useMutation(api.roles.addAdminNote);
  const deleteNote = useMutation(api.roles.deleteAdminNote);
  const addCallLog = useMutation(api.roles.addCallLog);
  const restrictAccess = useMutation(api.roles.restrictAccountAccess);
  const archiveUser = useMutation(api.roles.archiveUser);
  const generateFileUploadUrl = useMutation(api.roles.generateMemberFileUploadUrl);
  const addMemberFile = useMutation(api.roles.addMemberFile);
  const deleteMemberFile = useMutation(api.roles.deleteMemberFile);
  const addTicketReply = useMutation(api.support.addTicketReply);
  const generateReplyUploadUrl = useMutation(api.support.generateReplyUploadUrl);
  const updateTicketStatus = useMutation(api.support.updateTicketStatus);
  const removeForumBan = useMutation(api.forums.removeForumBan);

  const [currentTab, setCurrentTab] = useState(() => {
    // If coming from open tickets list, show inquiries tab
    const expandedTicketId = sessionStorage.getItem("expandedTicketId");
    return expandedTicketId ? "inquiries" : "profile";
  });
  const [expandedTickets, setExpandedTickets] = useState<Set<Id<"supportTickets">>>(() => {
    // Auto-expand ticket if coming from open tickets list
    const expandedTicketId = sessionStorage.getItem("expandedTicketId");
    if (expandedTicketId) {
      sessionStorage.removeItem("expandedTicketId");
      return new Set([expandedTicketId as Id<"supportTickets">]);
    }
    return new Set();
  });
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyFiles, setReplyFiles] = useState<Record<string, File[]>>({});
  const [newNote, setNewNote] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"active" | "hold" | "banned">("active");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Call log state
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState<"inbound" | "outbound">("inbound");
  const [callDuration, setCallDuration] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [callPhoneNumber, setCallPhoneNumber] = useState("");
  const [callDate, setCallDate] = useState(new Date().toISOString().split("T")[0]);

  // File upload state
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleStatusChange = async () => {
    try {
      await updateStatus({ userId, status: selectedStatus });
      toast.success(`Account status updated to ${selectedStatus}`);
      setShowStatusDialog(false);
    } catch (error) {
      toast.error("Failed to update account status");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      await addNote({ userId, content: newNote });
      toast.success("Note added successfully");
      setNewNote("");
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const handleRoleChange = async (newRole: "owner" | "admin" | "member") => {
    try {
      await changeRole({ userId, newRole });
      toast.success("Role updated successfully");
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleDelete = async () => {
    try {
      await archiveUser({ userId });
      toast.success("Member archived successfully");
      setShowDeleteDialog(false);
      onBack();
    } catch (error) {
      toast.error("Failed to archive member");
    }
  };

  const handleDeleteNote = async (noteId: Id<"adminNotes">) => {
    try {
      await deleteNote({ noteId });
      toast.success("Note deleted successfully");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleRestrictAccess = async () => {
    try {
      await restrictAccess({ userId, restricted: !user?.accountAccessRestricted });
      toast.success(
        user?.accountAccessRestricted
          ? "Account access restored"
          : "Account access restricted"
      );
    } catch (error) {
      toast.error("Failed to update account access");
    }
  };

  const handleAddCall = async () => {
    if (!callNotes.trim()) {
      toast.error("Please enter call notes");
      return;
    }

    try {
      await addCallLog({
        userId,
        callType,
        duration: callDuration ? parseInt(callDuration) : undefined,
        notes: callNotes,
        phoneNumber: callPhoneNumber || undefined,
        callDate: new Date(callDate).getTime(),
      });
      toast.success("Call logged successfully");
      setShowCallDialog(false);
      setCallNotes("");
      setCallDuration("");
      setCallPhoneNumber("");
      setCallDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      toast.error("Failed to log call");
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateFileUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      const { storageId } = await result.json();

      // Save file metadata
      await addMemberFile({
        userId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        storageId,
        description: fileDescription || undefined,
      });

      toast.success("File uploaded successfully");
      setShowFileDialog(false);
      setSelectedFile(null);
      setFileDescription("");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: Id<"memberFiles">) => {
    try {
      await deleteMemberFile({ fileId });
      toast.success("File deleted successfully");
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  const toggleTicketExpanded = (ticketId: Id<"supportTickets">) => {
    setExpandedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  const handleReplyFileChange = (ticketId: string, files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setReplyFiles((prev) => ({ ...prev, [ticketId]: fileArray }));
  };

  const handleRemoveReplyFile = (ticketId: string, index: number) => {
    setReplyFiles((prev) => {
      const files = prev[ticketId] || [];
      return {
        ...prev,
        [ticketId]: files.filter((_, i) => i !== index),
      };
    });
  };

  const handleSendReply = async (ticketId: Id<"supportTickets">) => {
    const message = replyTexts[ticketId] || "";
    const files = replyFiles[ticketId] || [];

    if (!message.trim() && files.length === 0) {
      toast.error("Please enter a message or attach a file");
      return;
    }

    try {
      // Upload files if any
      const attachments = [];
      for (const file of files) {
        const uploadUrl = await generateReplyUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        attachments.push({
          storageId,
          fileName: file.name,
          fileSize: file.size,
        });
      }

      // Send reply
      await addTicketReply({
        ticketId,
        message: message.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Clear form
      setReplyTexts((prev) => ({ ...prev, [ticketId]: "" }));
      setReplyFiles((prev) => ({ ...prev, [ticketId]: [] }));

      toast.success("Reply sent successfully");
    } catch (error) {
      toast.error("Failed to send reply");
      console.error(error);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === "owner") return <Shield className="h-4 w-4" />;
    if (role === "admin") return <UserCog className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    if (role === "owner") return "default";
    if (role === "admin") return "secondary";
    return "outline";
  };

  const getStatusBadgeVariant = (status?: string): "default" | "destructive" | "secondary" => {
    if (status === "banned") return "destructive";
    if (status === "hold") return "secondary";
    return "default";
  };

  const getStatusIcon = (status?: string) => {
    if (status === "banned") return <Ban className="h-4 w-4" />;
    if (status === "hold") return <Pause className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getTicketStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === "resolved" || status === "closed") return "secondary";
    if (status === "in_progress") return "default";
    return "destructive";
  };

  const getTicketStatusIcon = (status: string) => {
    if (status === "resolved" || status === "closed") return <CheckCircle2 className="h-3 w-3" />;
    if (status === "in_progress") return <Clock className="h-3 w-3" />;
    return <AlertCircle className="h-3 w-3" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  if (user === undefined || notes === undefined || callLogs === undefined || tickets === undefined || files === undefined || forumActivity === undefined) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="border-b bg-card px-4 py-3 flex-none">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Member Profile</h1>
            <p className="text-xs text-muted-foreground">
              View and manage member details
            </p>
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4 flex-none">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="inquiries">
            Inquiries
            {tickets.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {tickets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files">
            Files
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {files.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="flex-1 overflow-y-auto mt-0">
          <div className="space-y-4 p-4">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarUrl || user.avatar} />
                    <AvatarFallback>
                      {user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">{user.name || "Unknown"}</p>
                      {user.memberNumber && (
                        <Badge variant="outline" className="text-xs text-yellow-500">
                          {user.memberNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.username && (
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(user.role || "member")}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(user.role || "member")}
                          {(user.role || "member").toUpperCase()}
                        </span>
                      </Badge>
                      {myRole === "owner" && (
                        <Select
                          value={user.role || "member"}
                          onValueChange={(value) =>
                            handleRoleChange(value as "owner" | "admin" | "member")
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account Status:</span>
                    <Badge variant={getStatusBadgeVariant(user.accountStatus || "active")}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(user.accountStatus || "active")}
                        {(user.accountStatus || "active").toUpperCase()}
                      </span>
                    </Badge>
                  </div>

                  {user.phoneNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Phone:</span>
                      <span className="text-sm">{user.phoneNumber}</span>
                    </div>
                  )}

                  {(user.city || user.state) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Location:</span>
                      <span className="text-sm">
                        {[user.city, user.state].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}

                  {user.country && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Country:</span>
                      <span className="text-sm">{user.country}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account Access:</span>
                    <Badge variant={user.accountAccessRestricted ? "destructive" : "default"}>
                      {user.accountAccessRestricted ? "RESTRICTED" : "ALLOWED"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleRestrictAccess}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {user.accountAccessRestricted ? "Restore Account Access" : "Restrict Account Access"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedStatus("hold");
                    setShowStatusDialog(true);
                  }}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Put Account on Hold
                </Button>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedStatus("banned");
                    setShowStatusDialog(true);
                  }}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Ban Member
                </Button>
                {user.accountStatus !== "active" && (
                  <Button
                    variant="default"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedStatus("active");
                      setShowStatusDialog(true);
                    }}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Restore Account
                  </Button>
                )}
                <div className="pt-2 border-t">
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="flex-1 overflow-y-auto mt-0">
          <div className="space-y-4 p-4">
            {/* Call Logs Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Call Logs</CardTitle>
                <Button size="sm" onClick={() => setShowCallDialog(true)}>
                  <Phone className="mr-2 h-4 w-4" />
                  Log Call
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {callLogs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No calls logged yet
                  </p>
                ) : (
                  callLogs.map((log) => (
                    <div
                      key={log._id}
                      className="rounded-lg border bg-muted/50 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {log.callType === "inbound" ? (
                            <PhoneIncoming className="h-4 w-4 text-green-500" />
                          ) : (
                            <PhoneOutgoing className="h-4 w-4 text-blue-500" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {log.callType.toUpperCase()}
                          </Badge>
                          {log.duration && (
                            <span className="text-xs text-muted-foreground">
                              {log.duration} min
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.callDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      {log.phoneNumber && (
                        <p className="text-xs text-muted-foreground">
                          Phone: {log.phoneNumber}
                        </p>
                      )}
                      <p className="text-sm">{log.notes}</p>
                      <p className="text-xs text-muted-foreground">
                        Logged by {log.authorName} on {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Admin Notes Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note about this member (only visible to admins)..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-24"
                  />
                  <Button onClick={handleAddNote} size="sm" className="w-full">
                    Add Note
                  </Button>
                </div>

                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No admin notes yet
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note._id}
                        className="rounded-lg border bg-muted/50 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{note.authorName}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                            </p>
                            {myRole === "owner" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleDeleteNote(note._id)}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-foreground">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Forum Activity Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Forum Activity</span>
                  {user.forumBanExpiresAt && user.forumBanExpiresAt > Date.now() && (
                    <Badge variant="destructive" className="text-xs">
                      Banned
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ban Info */}
                {user.forumBanExpiresAt && user.forumBanExpiresAt > Date.now() && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">
                          Currently Banned from Forums
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {format(new Date(user.forumBanExpiresAt), "MMM d, yyyy h:mm a")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Time remaining: {(() => {
                            const diff = user.forumBanExpiresAt - Date.now();
                            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
                            const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                            const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
                            
                            if (days > 0) return `${days}d ${hours}h ${minutes}m`;
                            if (hours > 0) return `${hours}h ${minutes}m`;
                            return `${minutes}m`;
                          })()}
                        </p>
                        {user.forumBanReason && (
                          <p className="text-xs mt-1 text-muted-foreground">
                            Reason: {user.forumBanReason}
                          </p>
                        )}
                      </div>
                      {(myRole === "owner" || myRole === "admin") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await removeForumBan({ userId: user._id });
                              toast.success("Forum ban removed");
                            } catch {
                              toast.error("Failed to remove ban");
                            }
                          }}
                        >
                          Remove Ban
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning Count */}
                {user.forumWarningCount && user.forumWarningCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Total Warnings: <Badge variant="secondary" className="ml-1">{user.forumWarningCount}</Badge>
                  </div>
                )}

                {/* Posts */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Posts ({forumActivity.posts.length})</h4>
                  {forumActivity.posts.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No posts yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {forumActivity.posts.map((post) => (
                        <div
                          key={post._id}
                          className={`rounded-lg border p-3 space-y-2 ${
                            post.hasWarning ? "border-destructive bg-destructive/5" : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{post.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant={post.status === "approved" ? "default" : post.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                                  {post.status || "approved"}
                                </Badge>
                                {post.hasWarning && (
                                  <Badge variant="destructive" className="text-xs">
                                    ⚠️ Warning
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(post.createdAt), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => {
                                // Navigate to forums and open this post
                                window.open(`/`, "_blank");
                                toast.info("Forum post opened in new tab");
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="pt-2 border-t">
                  <h4 className="text-sm font-semibold mb-2">Comments ({forumActivity.comments.length})</h4>
                  {forumActivity.comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No comments yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {forumActivity.comments.map((comment) => (
                        <div
                          key={comment._id}
                          className={`rounded-lg border p-3 space-y-1 ${
                            comment.hasWarning ? "border-destructive bg-destructive/5" : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-2">{comment.content}</p>
                              {comment.hasWarning && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  ⚠️ Warning
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                On: {comment.post?.title || "Deleted post"} • {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                            {comment.post && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                onClick={() => {
                                  // Navigate to forums and open this post
                                  window.open(`/`, "_blank");
                                  toast.info("Forum post opened in new tab");
                                }}
                              >
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="flex-1 overflow-y-auto mt-0">
          <div className="space-y-4 p-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Support Tickets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tickets.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No support tickets submitted
                  </p>
                ) : (
                  tickets.map((ticket) => {
                    const isExpanded = expandedTickets.has(ticket._id);
                    const ticketFiles = replyFiles[ticket._id] || [];
                    
                    return (
                      <Card key={ticket._id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm">{ticket.subject}</p>
                                  <Badge variant={getTicketStatusBadgeVariant(ticket.status)} className="text-xs">
                                    <span className="flex items-center gap-1">
                                      {getTicketStatusIcon(ticket.status)}
                                      {ticket.status.replace("_", " ").toUpperCase()}
                                    </span>
                                  </Badge>
                                  {ticket.status !== "closed" && ticket.status !== "resolved" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-xs"
                                      onClick={async () => {
                                        try {
                                          await updateTicketStatus({ 
                                            ticketId: ticket._id, 
                                            status: "closed" 
                                          });
                                          toast.success("Ticket closed");
                                        } catch {
                                          toast.error("Failed to close ticket");
                                        }
                                      }}
                                    >
                                      Close Ticket
                                    </Button>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {ticket.category}
                              </Badge>
                            </div>

                            {/* Active Viewers */}
                            {isExpanded && (
                              <ActiveViewers
                                entityType="supportTicket"
                                entityId={ticket._id}
                              />
                            )}

                            {/* Message */}
                            <p className="text-sm text-muted-foreground">{ticket.message}</p>

                            {/* Expand/Collapse Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => toggleTicketExpanded(ticket._id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="mr-2 h-4 w-4" />
                                  Hide Conversation
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="mr-2 h-4 w-4" />
                                  View & Reply to Conversation
                                </>
                              )}
                            </Button>

                            {/* Replies Section */}
                            {isExpanded && (
                              <div className="space-y-3 pt-2">
                                <div className="border-t pt-3">
                                  <p className="text-xs font-semibold mb-3">Conversation History</p>
                                  <TicketRepliesSection ticketId={ticket._id} />
                                </div>

                                {/* Reply Form */}
                                <div className="border-t pt-3 space-y-3">
                                  <p className="text-xs font-semibold">Add Reply</p>
                                  <Textarea
                                    placeholder="Type your response or provide evidence..."
                                    value={replyTexts[ticket._id] || ""}
                                    onChange={(e) =>
                                      setReplyTexts((prev) => ({
                                        ...prev,
                                        [ticket._id]: e.target.value,
                                      }))
                                    }
                                    className="min-h-24"
                                  />

                                  {/* File Attachments */}
                                  {ticketFiles.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium">Attachments:</p>
                                      <div className="space-y-2">
                                        {ticketFiles.map((file, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-2 rounded border bg-muted/50 px-3 py-2"
                                          >
                                            <FileText className="h-4 w-4 flex-none" />
                                            <p className="flex-1 text-xs truncate">{file.name}</p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() => handleRemoveReplyFile(ticket._id, index)}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex gap-2">
                                    <Label
                                      htmlFor={`file-${ticket._id}`}
                                      className="flex-none"
                                    >
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        asChild
                                      >
                                        <span>
                                          <Paperclip className="mr-2 h-4 w-4" />
                                          Attach Files
                                        </span>
                                      </Button>
                                      <Input
                                        id={`file-${ticket._id}`}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) =>
                                          handleReplyFileChange(ticket._id, e.target.files)
                                        }
                                      />
                                    </Label>

                                    <Button
                                      size="sm"
                                      className="flex-1"
                                      onClick={() => handleSendReply(ticket._id)}
                                    >
                                      <Send className="mr-2 h-4 w-4" />
                                      Send Reply
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="flex-1 overflow-y-auto mt-0">
          <div className="space-y-4 p-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Private Files</CardTitle>
                <Button size="sm" onClick={() => setShowFileDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Files uploaded here are only visible to admins and owners
                </p>
                {files.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No files uploaded yet
                  </p>
                ) : (
                  files.map((file) => (
                    <div
                      key={file._id}
                      className="rounded-lg border bg-muted/50 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 flex-none" />
                            <p className="font-semibold text-sm truncate">{file.fileName}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.fileSize)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(file.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                          {file.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploaded by {file.uploaderName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileDownloadButton storageId={file.storageId} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteFile(file._id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Account Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to change this member's account status to{" "}
              <strong>{selectedStatus}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this member? They will be moved to the archived members list and will no longer have access to the app.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Log Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
            <DialogDescription>
              Record details about a phone call with this member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="callType">Call Type *</Label>
              <Select value={callType} onValueChange={(value) => setCallType(value as "inbound" | "outbound")}>
                <SelectTrigger id="callType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="callDate">Call Date *</Label>
              <Input
                id="callDate"
                type="date"
                value={callDate}
                onChange={(e) => setCallDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callPhone">Phone Number</Label>
              <Input
                id="callPhone"
                placeholder="(555) 123-4567"
                value={callPhoneNumber}
                onChange={(e) => setCallPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callDuration">Duration (minutes)</Label>
              <Input
                id="callDuration"
                type="number"
                placeholder="15"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callNotes">Call Notes *</Label>
              <Textarea
                id="callNotes"
                placeholder="Discussion summary, action items, follow-up needed..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCallDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCall}>Log Call</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload a private file for this member (visible to admins only)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileDescription">Description</Label>
              <Textarea
                id="fileDescription"
                placeholder="Brief description of this file..."
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                className="min-h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
