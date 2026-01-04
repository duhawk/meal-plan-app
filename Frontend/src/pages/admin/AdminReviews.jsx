import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Star } from 'lucide-react';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { reviews: fetchedReviews } = await api('/api/admin/reviews');
        setReviews(fetchedReviews);
      } catch (err) {
        setError(err.message || 'Failed to fetch reviews.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center text-text-secondary">Loading reviews...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      {reviews.length === 0 ? (
        <div className="text-center text-text-secondary py-8 dark:text-gray-400">No reviews found.</div>
      ) : (
        reviews.map((review) => (
          <div key={review.id} className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-4 dark:bg-slate-800/80 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-text-primary dark:text-white">{review.meal.dish_name}</p>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Reviewed by {review.user.name} on {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star size={16} className="fill-current" />
                <span className="font-bold text-text-primary dark:text-white">{review.rating.toFixed(1)}</span>
              </div>
            </div>
            {review.comment && <p className="text-text-primary mt-3 pt-3 border-t border-border-light dark:text-gray-300 dark:border-slate-700">{review.comment}</p>}
          </div>
        ))
      )}
    </div>
  );
}
