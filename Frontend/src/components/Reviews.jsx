import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import StarRating from './StarRating';
import { MessageSquare, EyeOff, Trash2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import Button from './ui/Button';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (userLoading) return;
    if (!user?.is_owner) {
      navigate('/app/home', { replace: true });
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const { reviews } = await api('/api/admin/reviews');
        setReviews(reviews);
      } catch (e) {
        setErr(e.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, userLoading]);

  const handleHide = async (reviewId) => {
    try {
      const data = await api(`/api/admin/reviews/${reviewId}/hide`, { method: 'PUT' });
      setReviews(cur => cur.map(r => r.id === reviewId ? { ...r, hidden: data.hidden } : r));
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Permanently delete this review?')) return;
    try {
      await api(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
      setReviews(cur => cur.filter(r => r.id !== reviewId));
    } catch (e) {
      setErr(e.message);
    }
  };

  const renderSkeleton = () => (
    <div className="bg-surface/50 backdrop-blur-lg rounded-xl border border-border-light/50 p-4 animate-pulse">
      <div className="h-4 w-3/4 bg-gray-300/50 rounded mb-3" />
      <div className="h-5 w-1/2 bg-gray-300/50 rounded" />
    </div>
  );

  if (loading || userLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">All Reviews</h1>
          <p className="text-text-secondary mt-1">Feedback from members on all meals.</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <div key={i}>{renderSkeleton()}</div>)}
        </div>
      </div>
    );
  }

  if (err) {
    return <div className="text-center py-10 text-red-500">{err}</div>;
  }

  const visibleReviews = reviews.filter(r => !r.hidden);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">All Reviews</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">
          Feedback from members on all meals.
          {reviews.length !== visibleReviews.length && (
            <span className="ml-2 text-xs text-text-secondary dark:text-gray-500">
              ({reviews.length - visibleReviews.length} hidden)
            </span>
          )}
        </p>
      </div>

      {!visibleReviews.length ? (
        <div className="text-center bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-12 dark:bg-slate-800/80 dark:border-slate-700">
          <MessageSquare className="mx-auto h-12 w-12 text-text-secondary dark:text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary dark:text-white">No reviews yet</h3>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Members can review past meals from the weekly menu or home page.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleReviews.map((review) => (
            <div
              key={review.id}
              className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-4 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 dark:bg-slate-800/80 dark:border-slate-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-text-primary dark:text-white">{review.meal.dish_name}</p>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    {new Date(review.meal.meal_date).toLocaleDateString()} · {review.user?.name}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-yellow-400">
                  <StarRating rating={review.rating} />
                  <span className="font-bold text-text-primary dark:text-white ml-1">{review.rating.toFixed(1)}</span>
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
                  Hide
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
        </div>
      )}
    </div>
  );
}
