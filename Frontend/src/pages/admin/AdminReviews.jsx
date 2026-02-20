import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Star, EyeOff, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';

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

  const handleHide = async (reviewId) => {
    try {
      const data = await api(`/api/admin/reviews/${reviewId}/hide`, { method: 'PUT' });
      setReviews(cur => cur.map(r => r.id === reviewId ? { ...r, hidden: data.hidden } : r));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Permanently delete this review?')) return;
    try {
      await api(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
      setReviews(cur => cur.filter(r => r.id !== reviewId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center text-text-secondary">Loading reviews...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  const visibleReviews = reviews.filter(r => !r.hidden);

  return (
    <div className="space-y-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {reviews.length === 0 ? (
        <div className="text-center text-text-secondary py-8 dark:text-gray-400">No reviews found.</div>
      ) : (
        <>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            {visibleReviews.length} visible · {reviews.length - visibleReviews.length} hidden
          </p>
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-surface/80 backdrop-blur-lg rounded-xl border p-4 dark:bg-slate-800/80 ${
                review.hidden
                  ? 'border-gray-300/50 opacity-60 dark:border-slate-600'
                  : 'border-border-light/50 dark:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-text-primary dark:text-white">{review.meal.dish_name}</p>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    {review.user?.name} · {new Date(review.created_at).toLocaleDateString()}
                    {review.hidden && <span className="ml-2 text-xs text-gray-400">(hidden)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star size={16} className="fill-current" />
                  <span className="font-bold text-text-primary dark:text-white">{review.rating.toFixed(1)}</span>
                </div>
              </div>
              {review.comment && (
                <p className="text-text-primary mt-3 pt-3 border-t border-border-light dark:text-gray-300 dark:border-slate-700">
                  {review.comment}
                </p>
              )}
              <div className="flex gap-2 mt-3 pt-2 border-t border-border-light/50 dark:border-slate-700/50">
                <Button
                  variant="secondary"
                  className="text-xs py-1 px-2 flex items-center gap-1"
                  onClick={() => handleHide(review.id)}
                >
                  <EyeOff size={12} />
                  {review.hidden ? 'Unhide' : 'Hide'}
                </Button>
                <Button
                  variant="danger"
                  className="text-xs py-1 px-2 flex items-center gap-1"
                  onClick={() => handleDelete(review.id)}
                >
                  <Trash2 size={12} />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
