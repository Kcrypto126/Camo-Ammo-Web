import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  MessageSquare,
  Plus,
  Heart,
  ChevronLeft,
  Send,
  Trash2,
  Flag,
  ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";

interface ForumsPageProps {
  onBack: () => void;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "tips", label: "Tips & Tricks" },
  { value: "stories", label: "Hunt Stories" },
  { value: "gear", label: "Gear & Equipment" },
  { value: "spots", label: "Hunting Spots" },
];

export default function ForumsPage({ onBack }: ForumsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<Id<"forumPosts"> | null>(
    null
  );

  const posts = useQuery(
    api.forums.getPosts,
    selectedCategory ? { category: selectedCategory } : {}
  );
  
  const banStatus = useQuery(api.forums.getMyForumBanStatus, {});

  if (selectedPostId) {
    return (
      <PostDetailView
        postId={selectedPostId}
        onBack={() => setSelectedPostId(null)}
        banStatus={banStatus}
      />
    );
  }

  const formatBanExpiry = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;
    
    if (diff <= 0) return "expired";
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Forums</h1>
            <p className="text-xs text-muted-foreground">
              Connect with other hunters
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowCreateDialog(true)}
            disabled={banStatus?.isBanned}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>
      
      {/* Ban Message */}
      {banStatus?.isBanned && banStatus.banExpiresAt && (
        <div className="sticky bottom-0 z-10 border-t bg-destructive/90 px-4 py-3 text-destructive-foreground">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 flex-none" />
            <div className="flex-1 text-xs">
              <p className="font-medium">
                At this time you are unable to participate in the forums for this app due to recent behaviors.
              </p>
              <p className="mt-1">
                Your ban will expire in {formatBanExpiry(banStatus.banExpiresAt)}{" "}
                ({new Date(banStatus.banExpiresAt).toLocaleDateString()})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            variant={selectedCategory === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(undefined)}
          >
            All
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-3 p-4 pb-6">
        {!posts ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 font-semibold">No posts yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Be the first to start a conversation!
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Create Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card
              key={post._id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => setSelectedPostId(post._id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="mb-1 font-semibold leading-tight">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{post.author?.name?.split(" ")[0] || "Unknown"}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(post.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  {post.category && (
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORIES.find((c) => c.value === post.category)
                        ?.label || post.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {post.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    <span>{post.likeCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{post.commentCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}

// Post Detail View Component
function PostDetailView({
  postId,
  onBack,
  banStatus,
}: {
  postId: Id<"forumPosts">;
  onBack: () => void;
  banStatus?: { isBanned: boolean; banExpiresAt?: number | null; banReason?: string | null; warningCount?: number } | undefined;
}) {
  const [commentText, setCommentText] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const post = useQuery(api.forums.getPost, { postId });
  const addComment = useMutation(api.forums.addComment);
  const toggleLike = useMutation(api.forums.toggleLikePost);
  const hasLiked = useQuery(api.forums.hasLikedPost, { postId });
  const deletePost = useMutation(api.forums.deletePost);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    if (banStatus?.isBanned) {
      toast.error("You are currently banned from commenting");
      return;
    }

    try {
      await addComment({
        postId,
        content: commentText,
      });
      setCommentText("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleToggleLike = async () => {
    try {
      await toggleLike({ postId });
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost({ postId });
      toast.success("Post deleted");
      onBack();
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  if (!post) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowReportDialog(true)}
            >
              <Flag className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4 pb-4">
          {/* Post */}
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {post.author?.name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{post.author?.name?.split(" ")[0] || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <h1 className="text-xl font-bold">{post.title}</h1>
            </CardHeader>
            <CardContent>
              <p className="mb-4 whitespace-pre-wrap text-sm">{post.content}</p>
              <div className="flex items-center gap-4">
                <Button
                  variant={hasLiked ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleLike}
                >
                  <Heart
                    className={`mr-2 h-4 w-4 ${hasLiked ? "fill-current" : ""}`}
                  />
                  {post.likeCount}
                </Button>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>{post.commentCount} comments</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="font-semibold">Comments</h3>
            {post.comments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No comments yet. Be the first to comment!
                  </p>
                </CardContent>
              </Card>
            ) : (
              post.comments.map((comment) => (
                <Card key={comment._id}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {comment.author?.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">
                        {comment.author?.name?.split(" ")[0] || "Unknown"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(comment.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Report Dialog */}
      <ReportPostDialog 
        postId={postId}
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
      />

      {/* Comment Input */}
      <div className="flex-none border-t bg-background p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
              }
            }}
          />
          <Button onClick={handleAddComment} disabled={!commentText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Report Post Dialog Component
function ReportPostDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: Id<"forumPosts">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<"spam" | "hate_speech" | "violence" | "harassment" | "">("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportPost = useMutation(api.forums.reportPost);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    try {
      setIsSubmitting(true);
      await reportPost({
        postId,
        reason,
        description: description || undefined,
      });
      toast.success("Post reported. An admin will review it shortly.");
      setReason("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to report post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Report Post
          </DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as typeof reason)}>
              <SelectTrigger>
                <SelectValue placeholder="Why are you reporting this post?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="hate_speech">Hate Speech</SelectItem>
                <SelectItem value="violence">Violence</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide more context about why this content should be reviewed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason("");
              setDescription("");
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} variant="destructive">
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Post Dialog Component
function CreatePostDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPost = useMutation(api.forums.createPost);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await createPost({
        title,
        content,
        category: category || undefined,
      });
      toast.success("Post created! It will be visible after admin approval.");
      setTitle("");
      setContent("");
      setCategory("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Share your thoughts with the hunting community
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What's on your mind?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Share your story, tips, or questions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
