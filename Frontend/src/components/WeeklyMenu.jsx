import React, { useState, useEffect } from 'react';
import { api } from "../lib/api";
import Modal from "./Modal";
import MealReview from "./MealReview";
import MealCard from "./MealCard";
import Button from './ui/Button';

export default function WeeklyMenu() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [activeMeal, setActiveMeal] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [showLatePlate, setShowLatePlate] = useState(false);
  const [lateNotes, setLateNotes] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const data = await api("/api/menu");
        setMeals(Array.isArray(data?.meals) ? data.meals : []);
      } catch (e) {
        setErr(e.message || "Failed to load menu.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Weekly Menu</h1>
          <p className="text-text-secondary mt-1">See what’s scheduled and take action.</p>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map(i => renderSkeleton())}
        </div>
      </div>
    );
  }
  if (err) return <div className="text-center py-10 text-red-600">{err}</div>;
  if (!meals.length) return <div className="text-center py-10 text-text-secondary">No meals scheduled for this week.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Weekly Menu</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">See what’s scheduled and take action.</p>
      </div>
      {success && (
        <div className="rounded-lg border border-green-700 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {meals.map((m) => (
          <MealCard
            key={m.id}
            meal={m}
            onReview={() => { setActiveMeal(m); setShowReview(true); setSuccess(""); }}
            onLatePlate={() => { setActiveMeal(m); setShowLatePlate(true); setLateNotes(""); setSuccess(""); }}
            onAttend={async () => {
              try {
                const data = await api(`/api/meals/${m.id}/attendance`, { method: 'POST' });
                setMeals(currentMeals => currentMeals.map(meal => 
                  meal.id === m.id ? { ...meal, is_attending: data.is_attending } : meal
                ));
                setSuccess(data.message);
              } catch (e) {
                setErr(e.message);
              }
            }}
          />
        ))}
      </div>
      
      {/* Review modal */}
      <Modal
        open={showReview}
        title={activeMeal ? `Review: ${activeMeal.dish_name || activeMeal.meal_type}` : 'Review Meal'}
        onClose={() => setShowReview(false)}
      >
        <MealReview
          onReviewSubmit={async ({ rating, comment }) => {
            if (!activeMeal) return;
            try {
              await api(`/api/meals/${activeMeal.id}/reviews`, {
                method: 'POST',
                body: { rating, comment }
              });
              setShowReview(false);
              setSuccess('Thanks for the feedback!');
            } catch (e) {
              setErr(e.message);
            }
          }}
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
                body: { notes: lateNotes || undefined }
              });
              setShowLatePlate(false);
              setSuccess('Late plate requested. We got you covered.');
            } catch (e) {
              setErr(e.message);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium mb-1 text-text-secondary">Notes (allergies, pickup window, etc.)</label>
            <textarea className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary" value={lateNotes} onChange={(e)=>setLateNotes(e.target.value)} placeholder="Optional" />
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

    
