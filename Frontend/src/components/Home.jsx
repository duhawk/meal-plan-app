import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import { api } from '../lib/api';
import MealCard from './MealCard';
import Modal from './Modal';
import MealReview from './MealReview';

export default function Home() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [activeMeal, setActiveMeal] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [showLatePlate, setShowLatePlate] = useState(false);
  const [lateNotes, setLateNotes] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await api('/api/today-meals');
        setMeals(Array.isArray(data?.meals) ? data.meals : []);
      } catch (e) {
        setErr(e.message || 'Failed to load meals.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleReviewSubmit = async ({ rating, comment }) => {
    if (!activeMeal) return;
    try {
      await api(`/api/meals/${activeMeal.id}/reviews`, {
        method: 'POST',
        body: { rating, comment },
      });
      setShowReview(false);
      setSuccess('Thanks for the feedback!');
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleLatePlateSubmit = async (e) => {
    e.preventDefault();
    if (!activeMeal) return;
    try {
      await api(`/api/meals/${activeMeal.id}/late-plates`, {
        method: 'POST',
        body: { notes: lateNotes || undefined },
      });
      setShowLatePlate(false);
      setSuccess('Late plate requested. We got you covered.');
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (err) {
    return <div className="text-red-500">{err}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Today's Meals</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">Here are the meals scheduled for today.</p>
      </div>

      {success && (
        <div className="rounded-lg border border-green-700 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {meals.length > 0 ? (
        <div className="space-y-6">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onReview={() => {
                setActiveMeal(meal);
                setShowReview(true);
                setSuccess('');
              }}
              onLatePlate={() => {
                setActiveMeal(meal);
                setShowLatePlate(true);
                setLateNotes('');
                setSuccess('');
              }}
              onAttend={async () => {
                try {
                  const data = await api(`/api/meals/${meal.id}/attendance`, { method: 'POST' });
                  setMeals((currentMeals) =>
                    currentMeals.map((m) =>
                      m.id === meal.id ? { ...m, is_attending: data.is_attending } : m
                    )
                  );
                  setSuccess(data.message);
                } catch (e) {
                  setErr(e.message);
                }
              }}
            />
          ))}
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
        <Link to="/app/reviews">
          <Button variant="secondary">See All Reviews</Button>
        </Link>
      </div>

      {/* Review modal */}
      <Modal
        open={showReview}
        title={activeMeal ? `Review: ${activeMeal.dish_name}` : 'Review Meal'}
        onClose={() => setShowReview(false)}
      >
        <MealReview
          onReviewSubmit={handleReviewSubmit}
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
            <label className="block text-sm font-medium mb-1 text-text-secondary">Notes (allergies, pickup window, etc.)</label>
            <textarea
              className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary"
              value={lateNotes}
              onChange={(e) => setLateNotes(e.target.value)}
              placeholder="Optional"
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
