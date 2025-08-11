// Meal_plan/Frontend/src/components/Home.jsx
import React from "react";

export default function Home(props) {
  // Try prop first; fall back to localStorage; else null
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();
  const currentUser = props.currentUser ?? stored ?? null;

  const safeName =
    (currentUser?.first_name && currentUser?.last_name
      ? `${currentUser.first_name} ${currentUser.last_name}`
      : currentUser?.first_name || currentUser?.name) || "Member";

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Welcome, {safeName}</h1>
      <p className="text-gray-600">
        Here’s what’s cooking and what’s new this week.
      </p>
      {/* ...rest of your Home content... */}
    </div>
  );
}
