import React, { useState } from 'react';

const MealReview = ({ MealId, onReviewSubmit, onCancel }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onReviewSubmit({ rating, comment });
      setRating(0);
      setComment('');
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    setRating(0);
    setComment('');
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '12px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>Rating:</label>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                padding: '8px',
                cursor: 'pointer',
                color: star <= rating ? '#ffd700' : '#ddd',
              }}
            >
              {star <= rating ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>Comment:</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{
            backgroundColor: 'white',
            color: 'black',
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            minHeight: '100px',
            fontSize: '16px',
          }}
          placeholder="Share your thoughts..."
          required
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Submit Review
        </button>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            flex: 1,
            backgroundColor: 'red',
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default MealReview;
