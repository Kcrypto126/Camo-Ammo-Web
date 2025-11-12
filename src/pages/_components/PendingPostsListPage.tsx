import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PendingPostsListPageProps {
  onBack: () => void;
}

export default function PendingPostsListPage({ onBack }: PendingPostsListPageProps) {
  const pendingPosts = useQuery(api.forums.getPendingPosts);
  const approvePost = useMutation(api.forums.approvePost);
  const rejectPost = useMutation(api.forums.rejectPost);
  const warnPost = useMutation(api.forums.warnPost);

  const [selectedPost, setSelectedPost] = useState<Id<"forumPosts"> | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (postId: Id<"forumPosts">) => {
    try {
      setIsProcessing(true);
      await approvePost({ postId });
      toast.success("Post approved successfully");
    } catch (error) {
      toast.error("Failed to approve post");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPost || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setIsProcessing(true);
      await rejectPost({ postId: selectedPost, reason: rejectionReason.trim() });
      toast.success("Post rejected");
      setShowRejectDialog(false);
      setSelectedPost(null);
      setRejectionReason("");
    } catch (error) {
      toast.error("Failed to reject post");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWarn = async (postId: Id<"forumPosts">) => {
    try {
      setIsProcessing(true);
      const result = await warnPost({ postId });
      if (result.warningCount === 1) {
        toast.success("First warning issued to user");
      } else {
        toast.success(`Warning issued (${result.warningCount} total). User may be banned from posting.`);
      }
    } catch (error) {
      toast.error("Failed to issue warning");
    } finally {
      setIsProcessing(false);
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
            <h1 className="text-lg font-bold">Forum Posts Pending Review</h1>
            <p className="text-xs text-muted-foreground">
              Review and approve or reject posts
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {pendingPosts === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : pendingPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No pending posts to review
              </p>
            </CardContent>
          </Card>
        ) : (
          pendingPosts.map((post) => (
            <Card key={post._id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{post.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {post.author?.name || "Unknown"} • {format(new Date(post.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      PENDING
                    </Badge>
                  </div>

                  {/* Content */}
                  <p className="text-sm line-clamp-3">{post.content}</p>

                  {/* Category */}
                  {post.category && (
                    <Badge variant="outline" className="text-xs">
                      {post.category}
                    </Badge>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleApprove(post._id)}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleWarn(post._id)}
                      disabled={isProcessing}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Warn
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedPost(post._id);
                        setShowRejectDialog(true);
                      }}
                      disabled={isProcessing}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this post. The author will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this post cannot be approved..."
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              Reject Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
