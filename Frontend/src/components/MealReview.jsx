import React, { useState } from 'react';
import Button from './ui/Button';
import { Star as StarIcon } from 'lucide-react';

const Star = ({ filled, half, onMouseEnter, onMouseLeave, onClick }) => (
  <div
    className="relative"
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={onClick}
  >
    <StarIcon className={`w-8 h-8 ${filled ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    {half && (
      <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
        <StarIcon className="w-8 h-8 text-yellow-400 fill-current" />
      </div>
    )}
  </div>
);

const MealReview = ({ onReviewSubmit, onCancel }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a rating.');
      return;
    }
    setSubmitting(true);
    try {
      await onReviewSubmit({ rating, comment });
      setRating(0);
      setComment('');
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    setRating(0);
    setComment('');
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2 text-text-secondary">Rating</label>
        <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              filled={hoverRating >= star || rating >= star}
              half={
                (hoverRating > star - 1 && hoverRating < star) ||
                (rating > star - 1 && rating < star)
              }
              onMouseEnter={(e) => {
                const rect = e.target.getBoundingClientRect();
                const isHalf = e.clientX - rect.left < rect.width / 2;
                setHoverRating(star - (isHalf ? 0.5 : 0));
              }}
              onClick={(e) => {
                const rect = e.target.getBoundingClientRect();
                const isHalf = e.clientX - rect.left < rect.width / 2;
                setRating(star - (isHalf ? 0.5 : 0));
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium mb-2 text-text-secondary">Comment</label>
        <textarea
          id="comment"
          className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts..."
          rows="4"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Submitting…' : 'Submit Review'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleCancel} className="w-full">Cancel</Button>
      </div>
    </form>
  );
};

export default MealReview;
