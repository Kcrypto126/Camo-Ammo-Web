import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const inquirySchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters"),
  contactInfo: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  numberOfHunters: z.string().optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

interface InquiryDialogProps {
  leaseId: Id<"landLeases"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InquiryDialog({ leaseId, open, onOpenChange }: InquiryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sendInquiry = useMutation(api.landLeases.sendInquiry);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
  });

  const onSubmit = async (data: InquiryFormData) => {
    if (!leaseId) return;

    setIsSubmitting(true);
    try {
      await sendInquiry({
        leaseId,
        message: data.message,
        contactInfo: data.contactInfo,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        endDate: data.endDate ? new Date(data.endDate).getTime() : undefined,
        numberOfHunters: data.numberOfHunters ? parseInt(data.numberOfHunters) : undefined,
      });

      toast.success("Inquiry sent successfully!");
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send inquiry:", error);
      toast.error("Failed to send inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Inquiry</DialogTitle>
          <DialogDescription>
            Contact the landowner about this lease opportunity. They will receive your message and respond
            directly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Tell the landowner about your interest in the property..."
              rows={5}
              {...register("message")}
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactInfo">Your Contact Info</Label>
            <Input
              id="contactInfo"
              placeholder="Phone or email (optional)"
              {...register("contactInfo")}
            />
            <p className="text-xs text-muted-foreground">
              Provide your preferred contact method if different from your profile
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Desired Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Desired End Date</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numberOfHunters">Number of Hunters</Label>
            <Input
              id="numberOfHunters"
              type="number"
              min="1"
              placeholder="How many hunters?"
              {...register("numberOfHunters")}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Inquiry"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
