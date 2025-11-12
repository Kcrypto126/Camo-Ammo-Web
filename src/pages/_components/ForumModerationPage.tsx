import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ActiveViewers } from "@/components/ui/active-viewers.tsx";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface ForumModerationPageProps {
  onBack: () => void;
}

export default function ForumModerationPage({ onBack }: ForumModerationPageProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<Id<"forumPosts"> | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const pendingPosts = useQuery(api.forums.getPendingPosts);
  const reportedPosts = useQuery(api.forums.getReportedPosts);
  
  const approvePost = useMutation(api.forums.approvePost);
  const rejectPost = useMutation(api.forums.rejectPost);
  const hidePost = useMutation(api.forums.hidePost);
  const lockPost = useMutation(api.forums.lockPost);
  const dismissReport = useMutation(api.forums.dismissReport);

  const handleApprove = async (postId: Id<"forumPosts">) => {
    try {
      await approvePost({ postId });
      toast.success("Post approved");
    } catch (error) {
      toast.error("Failed to approve post");
      console.error(error);
    }
  };

  const handleRejectClick = (postId: Id<"forumPosts">) => {
    setSelectedPostId(postId);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedPostId || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      await rejectPost({ postId: selectedPostId, reason: rejectionReason });
      toast.success("Post rejected");
      setShowRejectDialog(false);
      setSelectedPostId(null);
      setRejectionReason("");
    } catch (error) {
      toast.error("Failed to reject post");
      console.error(error);
    }
  };

  const handleHide = async (postId: Id<"forumPosts">) => {
    try {
      await hidePost({ postId });
      toast.success("Post hidden");
    } catch (error) {
      toast.error("Failed to hide post");
      console.error(error);
    }
  };

  const handleLock = async (postId: Id<"forumPosts">, locked: boolean) => {
    try {
      await lockPost({ postId, locked });
      toast.success(locked ? "Post locked" : "Post unlocked");
    } catch (error) {
      toast.error(`Failed to ${locked ? "lock" : "unlock"} post`);
      console.error(error);
    }
  };

  const handleDismissReport = async (reportId: Id<"forumReports">) => {
    try {
      await dismissReport({ reportId });
      toast.success("Report dismissed");
    } catch (error) {
      toast.error("Failed to dismiss report");
      console.error(error);
    }
  };

  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case "spam":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "hate_speech":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "violence":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "harassment":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "";
    }
  };

  const formatReason = (reason: string) => {
    return reason.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Forum Moderation</h1>
            <p className="text-xs text-muted-foreground">
              Review and moderate forum posts
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 pb-6">
        {/* Pending Posts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Pending Approval</CardTitle>
              </div>
              {pendingPosts && pendingPosts.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingPosts.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {pendingPosts === undefined ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : pendingPosts.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No pending posts
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPosts.map((post) => (
                    <Card key={post._id} className="border-amber-500/20">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold">{post.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  by {post.author?.name}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {post.category || "general"}
                              </Badge>
                            </div>
                            <ActiveViewers
                              entityType="forumPost"
                              entityId={post._id}
                            />
                            <p className="mt-2 text-sm line-clamp-3">{post.content}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Posted {format(post.createdAt, "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleApprove(post._id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => handleRejectClick(post._id)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Reported Posts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base">Reported Posts</CardTitle>
              </div>
              {reportedPosts && reportedPosts.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {reportedPosts.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {reportedPosts === undefined ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : reportedPosts.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No reported posts
                </div>
              ) : (
                <div className="space-y-3">
                  {reportedPosts.map((report) => (
                    <Card key={report._id} className="border-red-500/20">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <Badge className={`mb-2 ${getReasonBadgeColor(report.reason)}`}>
                                  {formatReason(report.reason)}
                                </Badge>
                                <h3 className="font-semibold">{report.post?.title || "Deleted Post"}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  by {report.post?.author?.name || "Unknown"}
                                </p>
                              </div>
                            </div>
                            {report.post && (
                              <ActiveViewers
                                entityType="forumPost"
                                entityId={report.post._id}
                              />
                            )}
                            {report.post && (
                              <p className="mt-2 text-sm line-clamp-3">{report.post.content}</p>
                            )}
                            <div className="mt-2 text-xs text-muted-foreground">
                              <p>Reported by {report.reporter?.name}</p>
                              <p>on {format(report.createdAt, "MMM d, yyyy 'at' h:mm a")}</p>
                              {report.description && (
                                <p className="mt-1 italic">"{report.description}"</p>
                              )}
                            </div>
                          </div>
                          {report.post && (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleHide(report.post!._id)}
                              >
                                <EyeOff className="mr-2 h-4 w-4" />
                                Hide
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLock(report.post!._id, !report.post!.isLocked)}
                              >
                                {report.post.isLocked ? (
                                  <Unlock className="mr-2 h-4 w-4" />
                                ) : (
                                  <Lock className="mr-2 h-4 w-4" />
                                )}
                                {report.post.isLocked ? "Unlock" : "Lock"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDismissReport(report._id)}
                              >
                                Dismiss Report
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this post. The author will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this post was rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedPostId(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              Reject Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
