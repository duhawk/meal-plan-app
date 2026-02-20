import React, { useState, useEffect } from 'react';
import { api } from "../lib/api";
import Modal from "./Modal";
import MealReview from "./MealReview";
import MealCard from "./MealCard";
import Button from './ui/Button';
import { useUser } from '../contexts/UserContext';

// Group meals by day date string, then by meal_type within each day
function groupByDay(meals) {
  const days = {};
  meals.forEach((meal) => {
    const dateKey = new Date(meal.meal_date).toDateString();
    if (!days[dateKey]) days[dateKey] = { Lunch: null, Dinner: null, date: new Date(meal.meal_date) };
    days[dateKey][meal.meal_type] = meal;
  });
  // Return sorted array of day objects
  return Object.values(days).sort((a, b) => a.date - b.date);
}

export default function WeeklyMenu() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [activeMeal, setActiveMeal] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [showLatePlate, setShowLatePlate] = useState(false);
  const [lateNotes, setLateNotes] = useState("");
  const [latePickupTime, setLatePickupTime] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState('All');
  const { user } = useUser();

  const fetchMeals = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await api("/api/menu");
      setMeals(Array.isArray(data?.meals) ? data.meals : []);
    } catch (e) {
      setErr(e.message || "Failed to load menu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeals(); }, [user]);

  const renderSkeleton = () => (
    <div className="bg-surface/50 backdrop-blur-lg rounded-xl border border-border-light/50 p-6 animate-pulse">
      <div className="w-full h-48 bg-gray-300/50 rounded-lg mb-4" />
      <div className="h-4 w-3/4 bg-gray-300/50 rounded mb-3" />
      <div className="h-6 w-1/2 bg-gray-300/50 rounded" />
      <div className="h-4 w-full bg-gray-300/50 rounded mt-2" />
      <div className="mt-6 flex gap-3">
        <div className="h-10 w-32 bg-gray-300/50 rounded-lg" />
        <div className="h-10 w-24 bg-gray-300/50 rounded-lg" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Weekly Menu</h1>
          <p className="text-text-secondary mt-1 dark:text-gray-400">See what's scheduled and take action.</p>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map(i => <div key={i}>{renderSkeleton()}</div>)}
        </div>
      </div>
    );
  }
  if (err) return <div className="text-center py-10 text-red-600">{err}</div>;
  if (!meals.length) return <div className="text-center py-10 text-text-secondary dark:text-gray-400">No upcoming meals scheduled.</div>;

  const days = groupByDay(meals);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Weekly Menu</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">See what's scheduled and take action.</p>
      </div>
      {success && (
        <div className="rounded-lg border border-green-700 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Meal type filter */}
      <div className="flex gap-2">
        {['All', 'Lunch', 'Dinner'].map((f) => (
          <button
            key={f}
            onClick={() => setMealTypeFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              mealTypeFilter === f
                ? 'bg-primary text-white'
                : 'bg-surface/80 border border-border-light/50 text-text-secondary dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {days.map(({ date, Lunch, Dinner }) => {
          const slots = [
            { meal: Lunch, type: 'Lunch', badgeCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
            { meal: Dinner, type: 'Dinner', badgeCls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
          ].filter(({ type }) => mealTypeFilter === 'All' || mealTypeFilter === type);

          if (slots.length === 0) return null;

          return (
          <div key={date.toDateString()}>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-3">
              {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {slots.map(({ meal: m, type, badgeCls }) => {
                const isPast = m ? new Date(m.meal_date) < new Date() : false;
                const needsConfirmation = m && isPast && m.is_attending && m.attendance_confirmed === null;
                return (
                  <div key={type}>
                    <span className={`inline-block mb-2 text-xs font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
                      {type}
                    </span>
                    {m ? (
                      <div className="space-y-3">
                        <MealCard
                          meal={m}
                          onReview={() => { setActiveMeal(m); setShowReview(true); setSuccess(""); }}
                          onLatePlate={() => { setActiveMeal(m); setShowLatePlate(true); setLateNotes(""); setLatePickupTime(""); setSuccess(""); }}
                          onAttend={async () => {
                            try {
                              const data = await api(`/api/meals/${m.id}/attendance`, { method: 'POST' });
                              setMeals(cur => cur.map(meal => meal.id === m.id ? { ...meal, is_attending: data.is_attending } : meal));
                              setSuccess(data.message);
                            } catch (e) { setErr(e.message); }
                          }}
                        />
                        {needsConfirmation && (
                          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                              Did you eat at <span className="font-semibold">{m.dish_name}</span>?
                            </p>
                            <div className="flex gap-2">
                              <Button className="text-xs py-1.5 px-3" onClick={() => handleConfirmAttendance(m, true)}>
                                Yes
                              </Button>
                              <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => handleConfirmAttendance(m, false)}>
                                No
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border-light p-6 text-center text-text-secondary dark:border-slate-600 dark:text-gray-500 text-sm">
                        Not scheduled
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>

      {/* Review modal */}
      <Modal
        open={showReview}
        title={activeMeal ? `${activeMeal.user_review ? 'Edit ' : ''}Review: ${activeMeal.dish_name || activeMeal.meal_type}` : 'Review Meal'}
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
        title={activeMeal ? `Late Plate: ${activeMeal.dish_name || activeMeal.meal_type}` : 'Late Plate'}
        onClose={() => setShowLatePlate(false)}
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!activeMeal) return;
            try {
              await api(`/api/meals/${activeMeal.id}/late-plates`, {
                method: 'POST',
                body: { notes: lateNotes || undefined, pickup_time: latePickupTime || undefined },
              });
              setShowLatePlate(false);
              setSuccess('Late plate requested. We got you covered.');
            } catch (e) {
              setErr(e.message);
            }
          }}
        >
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
