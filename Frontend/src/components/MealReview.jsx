import React, { useState } from 'react';
import Button from './ui/Button';

const Star = ({ active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-3xl px-0.5 transition-colors ${active ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
    aria-label={active ? 'selected' : 'unselected'}
  >
    {'★'}
  </button>
);

const MealReview = ({ onReviewSubmit, onCancel }) => {
  const [rating, setRating] = useState(0);
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
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} active={star <= rating} onClick={() => setRating(star)} />
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
