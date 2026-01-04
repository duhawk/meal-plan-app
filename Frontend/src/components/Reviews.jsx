import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Star, MessageSquare } from 'lucide-react';

export default function Reviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr('');
        const { meals } = await api('/api/menu');
        const top = meals.slice(0, 7);
        const results = [];
        for (const m of top) {
          try {
            const { reviews } = await api(`/api/meals/${m.id}/reviews`);
            reviews.slice(0, 3).forEach((r) => results.push({ meal: m, review: r }));
          } catch {}
        }
        setItems(results);
      } catch (e) {
        setErr(e.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderSkeleton = () => (
    <div className="bg-surface/50 backdrop-blur-lg rounded-xl border border-border-light/50 p-4 animate-pulse">
      <div className="h-4 w-3/4 bg-gray-300/50 rounded mb-3" />
      <div className="h-5 w-1/2 bg-gray-300/50 rounded" />
    </div>
  );

  if (loading) return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Recent Reviews</h1>
        <p className="text-text-secondary mt-1">Feedback from members on recent meals.</p>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => renderSkeleton())}
      </div>
    </div>
  );

  if (err) return <div className="text-center py-10 text-red-500">{err}</div>;
  
  if (!items.length) return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Recent Reviews</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">Feedback from members on recent meals.</p>
      </div>
      <div className="text-center bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-12 dark:bg-slate-800/80 dark:border-slate-700">
        <MessageSquare className="mx-auto h-12 w-12 text-text-secondary dark:text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-text-primary dark:text-white">No recent reviews</h3>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Be the first to review a meal from the weekly menu.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Recent Reviews</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">Feedback from members on recent meals.</p>
      </div>
      <div className="space-y-4">
        {items.map(({ meal, review }) => (
          <div key={`${meal.id}-${review.id}`} className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-4 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 dark:bg-slate-800/80 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-text-primary dark:text-white">{meal.dish_name || meal.meal_type}</p>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  {new Date(meal.meal_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star size={16} className="fill-current" />
                <span className="font-bold text-text-primary dark:text-white">{review.rating.toFixed(1)}</span>
              </div>
            </div>
            {review.comment && <p className="text-text-primary mt-3 pt-3 border-t border-border-light dark:text-gray-300 dark:border-slate-700">{review.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
