import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ratingService } from "@/lib/rating-service";
import { useAuth } from "@/hooks/use-auth";

interface RatingDialogProps {
  rideId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRatingSubmitted?: () => void;
}

export const RatingDialog = ({
  rideId,
  open,
  onOpenChange,
  onRatingSubmitted,
}: RatingDialogProps) => {
  const { session } = useAuth();
  const [score, setScore] = useState(0);
  const [hoveredScore, setHoveredScore] = useState(0);
  const [review, setReview] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!session?.token || score === 0) return;

    setIsSubmitting(true);
    try {
      await ratingService.createRating(session.token, {
        rideId,
        score,
        review: review.trim() || undefined,
        isAnonymous,
      });

      toast({
        title: "Rating submitted",
        description: "Thank you for your feedback!",
      });

      onOpenChange(false);
      if (onRatingSubmitted) {
        onRatingSubmitted();
      }

      // Reset form
      setScore(0);
      setReview("");
      setIsAnonymous(false);
    } catch (error) {
      console.error("Failed to submit rating:", error);
      toast({
        title: "Failed to submit rating",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate Your Trip</DialogTitle>
          <DialogDescription>
            How was your experience? Your feedback helps improve our service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  onMouseEnter={() => setHoveredScore(star)}
                  onMouseLeave={() => setHoveredScore(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredScore || score)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">Review (Optional)</Label>
            <Textarea
              id="review"
              placeholder="Share your experience..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {review.length}/1000 characters
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
            />
            <Label
              htmlFor="anonymous"
              className="text-sm font-normal cursor-pointer"
            >
              Submit anonymously
            </Label>
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
          <Button
            onClick={handleSubmit}
            disabled={score === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};




