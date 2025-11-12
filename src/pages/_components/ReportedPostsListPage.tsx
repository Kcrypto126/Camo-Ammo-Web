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
import { ArrowLeft, CheckCircle, XCircle, EyeOff, Lock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ReportedPostsListPageProps {
  onBack: () => void;
}

export default function ReportedPostsListPage({ onBack }: ReportedPostsListPageProps) {
  const reportedPosts = useQuery(api.forums.getReportedPosts);
  const approvePost = useMutation(api.forums.approvePost);
  const rejectPost = useMutation(api.forums.rejectPost);
  const hidePost = useMutation(api.forums.hidePost);
  const lockPost = useMutation(api.forums.lockPost);
  const dismissReport = useMutation(api.forums.dismissReport);
  const warnPost = useMutation(api.forums.warnPost);

  const [selectedPost, setSelectedPost] = useState<{
    postId: Id<"forumPosts">;
    reportId: Id<"forumReports">;
  } | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleHidePost = async (postId: Id<"forumPosts">, reportId: Id<"forumReports">) => {
    try {
      setIsProcessing(true);
      await hidePost({ postId });
      await dismissReport({ reportId });
      toast.success("Post hidden from public");
    } catch (error) {
      toast.error("Failed to hide post");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLockPost = async (postId: Id<"forumPosts">, isLocked: boolean, reportId: Id<"forumReports">) => {
    try {
      setIsProcessing(true);
      await lockPost({ postId, locked: !isLocked });
      await dismissReport({ reportId });
      toast.success(isLocked ? "Post unlocked" : "Post locked");
    } catch (error) {
      toast.error("Failed to lock/unlock post");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (postId: Id<"forumPosts">, reportId: Id<"forumReports">) => {
    try {
      setIsProcessing(true);
      await approvePost({ postId });
      await dismissReport({ reportId });
      toast.success("Report dismissed, post remains visible");
    } catch (error) {
      toast.error("Failed to approve post");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWarn = async (postId: Id<"forumPosts">, reportId: Id<"forumReports">) => {
    try {
      setIsProcessing(true);
      const result = await warnPost({ postId });
      await dismissReport({ reportId });
      if (result.warningCount === 1) {
        toast.success("First warning issued to user, report dismissed");
      } else {
        toast.success(`Warning issued (${result.warningCount} total). User may be banned. Report dismissed.`);
      }
    } catch (error) {
      toast.error("Failed to issue warning");
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
      await rejectPost({ postId: selectedPost.postId, reason: rejectionReason.trim() });
      await dismissReport({ reportId: selectedPost.reportId });
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

  const getReportReasonLabel = (reason: string) => {
    switch (reason) {
      case "spam":
        return "Spam";
      case "hate_speech":
        return "Hate Speech";
      case "violence":
        return "Violence";
      case "harassment":
        return "Harassment";
      default:
        return reason;
    }
  };

  const getReportReasonColor = (reason: string): "default" | "destructive" => {
    switch (reason) {
      case "spam":
        return "default";
      case "hate_speech":
      case "violence":
      case "harassment":
        return "destructive";
      default:
        return "default";
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
            <h1 className="text-lg font-bold">Reported Forum Posts</h1>
            <p className="text-xs text-muted-foreground">
              Review reports and take action
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {reportedPosts === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : reportedPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No reported posts to review
              </p>
            </CardContent>
          </Card>
        ) : (
          reportedPosts.map((report) => (
            <Card key={report._id} className="border-red-500/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Report Info */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b">
                    <div>
                      <Badge variant={getReportReasonColor(report.reason)} className="mb-2">
                        {getReportReasonLabel(report.reason)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Reported by: {report.reporter?.name || "Unknown"} • {format(new Date(report.createdAt), "MMM d, yyyy")}
                      </p>
                      {report.description && (
                        <p className="text-xs mt-1 italic">"{report.description}"</p>
                      )}
                    </div>
                  </div>

                  {/* Post Info */}
                  {report.post && (
                    <>
                      <div>
                        <p className="font-semibold text-sm">{report.post.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {report.post.author?.name || "Unknown"} • {format(new Date(report.post.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>

                      {/* Content */}
                      <p className="text-sm line-clamp-3">{report.post.content}</p>

                      {/* Status Badges */}
                      <div className="flex gap-2 flex-wrap">
                        {report.post.status && (
                          <Badge variant="outline" className="text-xs">
                            {report.post.status}
                          </Badge>
                        )}
                        {report.post.isLocked && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="mr-1 h-3 w-3" />
                            Locked
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleHidePost(report.post!._id, report._id)}
                          disabled={isProcessing}
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          Hide
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLockPost(report.post!._id, report.post!.isLocked || false, report._id)}
                          disabled={isProcessing}
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          {report.post.isLocked ? "Unlock" : "Lock"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleWarn(report.post!._id, report._id)}
                          disabled={isProcessing}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Warn
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedPost({
                              postId: report.post!._id,
                              reportId: report._id,
                            });
                            setShowRejectDialog(true);
                          }}
                          disabled={isProcessing}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-500 hover:bg-green-600 col-span-2"
                          onClick={() => handleApprove(report.post!._id, report._id)}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Dismiss Report
                        </Button>
                      </div>
                    </>
                  )}
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
                placeholder="Explain why this post is being removed..."
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
