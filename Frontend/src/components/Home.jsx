import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import { api } from '../lib/api';
import MealCard from './MealCard';
import Modal from './Modal';
import MealReview from './MealReview';
import { useUser } from '../contexts/UserContext';
import { Star } from 'lucide-react';

export default function Home() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [activeMeal, setActiveMeal] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [showLatePlate, setShowLatePlate] = useState(false);
  const [lateNotes, setLateNotes] = useState('');
  const [latePickupTime, setLatePickupTime] = useState('');
  const { user } = useUser();

  const fetchMeals = async () => {
    setLoading(true);
    setErr('');
    try {
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const data = await api(`/api/today-meals?date=${localDate}`);
      const raw = Array.isArray(data?.meals) ? data.meals : [];
      // Ensure Lunch appears before Dinner
      raw.sort((a, b) => {
        if (a.meal_type === 'Lunch' && b.meal_type === 'Dinner') return -1;
        if (a.meal_type === 'Dinner' && b.meal_type === 'Lunch') return 1;
        return 0;
      });
      setMeals(raw);
    } catch (e) {
      setErr(e.message || 'Failed to load meals.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const data = await api('/api/pending-reviews');
      setPendingReviews(Array.isArray(data?.meals) ? data.meals : []);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchPendingReviews();
  }, []);

  const handleReviewSubmit = async ({ rating, comment }) => {
    if (!activeMeal) return;
    const isEdit = !!activeMeal.user_review;
    try {
      if (isEdit) {
        await api(`/api/meals/${activeMeal.id}/reviews/${activeMeal.user_review.id}`, {
          method: 'PUT',
          body: { rating, comment },
        });
      } else {
        await api(`/api/meals/${activeMeal.id}/reviews`, {
          method: 'POST',
          body: { rating, comment },
        });
      }
      setShowReview(false);
      setSuccess(isEdit ? 'Review updated!' : 'Thanks for the feedback!');
      fetchMeals();
      fetchPendingReviews();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleReviewDelete = async () => {
    if (!activeMeal?.user_review) return;
    try {
      await api(`/api/meals/${activeMeal.id}/reviews/${activeMeal.user_review.id}`, { method: 'DELETE' });
      setShowReview(false);
      setSuccess('Review deleted.');
      fetchMeals();
      fetchPendingReviews();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleConfirmAttendance = async (meal, confirmed) => {
    try {
      await api(`/api/meals/${meal.id}/attendance/confirm`, {
        method: 'POST',
        body: { confirmed },
      });
      setMeals((cur) =>
        cur.map((m) => m.id === meal.id ? { ...m, attendance_confirmed: confirmed } : m)
      );
      setSuccess(confirmed ? 'Attendance confirmed — thanks!' : 'Got it, marked as no-show.');
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleLatePlateSubmit = async (e) => {
    e.preventDefault();
    if (!activeMeal) return;
    try {
      // If attending, toggle off attendance first
      if (activeMeal.is_attending) {
        await api(`/api/meals/${activeMeal.id}/attendance`, { method: 'POST' });
      }
      await api(`/api/meals/${activeMeal.id}/late-plates`, {
        method: 'POST',
        body: { notes: lateNotes || undefined, pickup_time: latePickupTime || undefined },
      });
      setMeals((current) =>
        current.map((m) => m.id === activeMeal.id ? { ...m, has_late_plate: true, is_attending: false } : m)
      );
      setShowLatePlate(false);
      setSuccess('Late plate requested. We got you covered.');
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (err && !meals.length) {
    return <div className="text-red-500">{err}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Today's Meals</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">Here are the meals scheduled for today.</p>
      </div>

      {pendingReviews.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 dark:border-primary/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-primary fill-primary" />
            <p className="text-sm font-semibold text-primary">
              {pendingReviews.length === 1
                ? 'You have 1 meal to review'
                : `You have ${pendingReviews.length} meals to review`}
            </p>
          </div>
          <div className="space-y-2">
            {pendingReviews.map(meal => (
              <div key={meal.id} className="flex items-center justify-between bg-surface/60 dark:bg-slate-800/60 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-text-primary dark:text-white">{meal.dish_name}</span>
                  <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${meal.meal_type === 'Lunch' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
                    {meal.meal_type}
                  </span>
                  <span className="ml-2 text-xs text-text-secondary dark:text-gray-400">
                    {new Date(meal.meal_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveMeal({ ...meal, user_review: null });
                    setShowReview(true);
                    setSuccess('');
                    setErr('');
                  }}
                  className="text-xs font-medium text-primary hover:underline ml-3 shrink-0"
                >
                  Write Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-700 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {meals.length > 0 ? (
        <div className="space-y-6">
          {meals.map((meal) => {
            const mealDate = new Date(meal.meal_date);
            const isPast = mealDate < new Date();
            const needsConfirmation = isPast && meal.is_attending && meal.attendance_confirmed === null;
            return (
              <div key={meal.id} className="space-y-3">
                <MealCard
                  meal={meal}
                  onReview={() => {
                    setActiveMeal(meal);
                    setShowReview(true);
                    setSuccess('');
                    setErr('');
                  }}
                  onLatePlate={() => {
                    setActiveMeal(meal);
                    setShowLatePlate(true);
                    setLateNotes('');
                    setLatePickupTime('');
                    setSuccess('');
                    setErr('');
                  }}
                  onCancelLatePlate={async () => {
                    try {
                      await api(`/api/meals/${meal.id}/late-plates`, { method: 'DELETE' });
                      setMeals((current) =>
                        current.map((m) => m.id === meal.id ? { ...m, has_late_plate: false } : m)
                      );
                      setSuccess('Late plate request cancelled.');
                    } catch (e) {
                      setErr(e.message);
                    }
                  }}
                  onAttend={async () => {
                    try {
                      // Toggling ON attendance — cancel any late plate first
                      if (!meal.is_attending && meal.has_late_plate) {
                        await api(`/api/meals/${meal.id}/late-plates`, { method: 'DELETE' });
                      }
                      const data = await api(`/api/meals/${meal.id}/attendance`, { method: 'POST' });
                      setMeals((current) =>
                        current.map((m) =>
                          m.id === meal.id ? { ...m, is_attending: data.is_attending, has_late_plate: data.is_attending ? false : m.has_late_plate } : m
                        )
                      );
                      setSuccess(data.message);
                    } catch (e) {
                      setErr(e.message);
                    }
                  }}
                />
                {needsConfirmation && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Did you eat at <span className="font-semibold">{meal.dish_name}</span>?
                    </p>
                    <div className="flex gap-2">
                      <Button className="text-xs py-1.5 px-3" onClick={() => handleConfirmAttendance(meal, true)}>
                        Yes
                      </Button>
                      <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => handleConfirmAttendance(meal, false)}>
                        No
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-12 dark:bg-slate-800/80 dark:border-slate-700">
          <p className="text-lg font-semibold text-text-primary dark:text-white">No meals scheduled for today.</p>
        </div>
      )}

      <div className="mt-8 flex justify-center gap-4">
        <Link to="/app/menu">
          <Button>View Weekly Menu</Button>
        </Link>
        {user?.is_owner && (
          <Link to="/app/reviews">
            <Button variant="secondary">See All Reviews</Button>
          </Link>
        )}
      </div>

      {/* Review modal */}
      <Modal
        open={showReview}
        title={activeMeal ? `${activeMeal.user_review ? 'Edit' : ''} Review: ${activeMeal.dish_name}` : 'Review Meal'}
        onClose={() => setShowReview(false)}
      >
        <MealReview
          key={activeMeal?.id}
          isEdit={!!activeMeal?.user_review}
          initialRating={activeMeal?.user_review?.rating ?? 0}
          initialComment={activeMeal?.user_review?.comment ?? ''}
          onReviewSubmit={handleReviewSubmit}
          onDelete={handleReviewDelete}
          onCancel={() => setShowReview(false)}
        />
      </Modal>

      {/* Late plate modal */}
      <Modal
        open={showLatePlate}
        title={activeMeal ? `Late Plate: ${activeMeal.dish_name}` : 'Late Plate'}
        onClose={() => setShowLatePlate(false)}
      >
        <form className="space-y-4" onSubmit={handleLatePlateSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-secondary">Notes (allergies, requests, etc.)</label>
            <textarea
              className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
              value={lateNotes}
              onChange={(e) => setLateNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-secondary">Desired Pickup Time (optional)</label>
            <input
              type="time"
              className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={latePickupTime}
              onChange={(e) => setLatePickupTime(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="w-full">Submit Request</Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => setShowLatePlate(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
