// Meal_plan/Frontend/src/components/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';

export default function Home() {
  return (
    <div className="text-center">
      <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-12 dark:bg-slate-800/80 dark:border-slate-700">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary dark:text-white">Welcome to Fraternity Meals</h1>
        <p className="text-text-secondary mt-4 max-w-2xl mx-auto dark:text-gray-300">
          This is your dashboard. From here, you can view the weekly menu, submit reviews, and manage your meal plan.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/app/menu">
            <Button>View Weekly Menu</Button>
          </Link>
          <Link to="/app/reviews">
            <Button variant="secondary">See Reviews</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
