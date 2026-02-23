
import { useState, useEffect } from 'react';
import { Calendar, Star, CheckCircle, Users } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../lib/api';
import Button from './ui/Button';
import StarRating from './StarRating';

export default function MealCard({ meal, onAttend, onReview, onLatePlate, onCancelLatePlate }) {
  const { user } = useUser();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const mealDate = new Date(meal.meal_date);
  const isPast = mealDate < now;

  const imageUrl = meal.image_url
    ? meal.image_url.startsWith('http') ? meal.image_url : `${BASE_URL}${meal.image_url}`
    : null;

  const mealTypeBadge = meal.meal_type === 'Lunch'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';

  const hasRating = meal.avg_rating != null && meal.review_count >= 3;

  return (
    <div className="bg-surface backdrop-blur-lg rounded-xl border border-border-light shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 dark:bg-slate-800/80 dark:border-slate-700">
      {imageUrl && (
        <img src={imageUrl} alt={meal.dish_name} className="w-full h-48 object-cover rounded-t-xl" />
      )}
      <div className="p-6">
        <div className="flex items-center justify-between text-sm text-text-secondary dark:text-gray-400 mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>{mealDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.is_admin && (
              <>
                <Users size={14} />
                <span>{meal.attendance_count} Attending</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mealTypeBadge}`}>
            {meal.meal_type}
          </span>
          {hasRating && (
            <span className="flex items-center gap-1 text-xs text-text-secondary dark:text-gray-400">
              <StarRating rating={meal.avg_rating} />
              <span className="font-semibold text-text-primary dark:text-white ml-0.5">{meal.avg_rating.toFixed(1)}</span>
              <span>· {meal.review_count} reviews</span>
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-text-primary dark:text-white">{meal.dish_name}</h3>
        <p className="text-text-secondary mt-1 dark:text-gray-300">{meal.description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={onAttend}
            disabled={isPast}
            variant={meal.is_attending ? 'primary' : 'danger'}
            className="w-full sm:w-auto"
          >
            <CheckCircle size={16} className="mr-2" />
            {meal.is_attending ? 'Attending' : 'Not Attending'}
          </Button>
          <Button onClick={onReview} disabled={!isPast} variant="secondary" className="w-full sm:w-auto">
            <Star size={16} className="mr-2" />
            {meal.user_review ? 'Edit Review' : 'Review'}
          </Button>
          {meal.has_late_plate ? (
            <Button onClick={onCancelLatePlate} disabled={isPast} variant="secondary" className="w-full sm:w-auto text-green-700 border-green-500 bg-green-50 hover:bg-red-50 hover:text-red-600 hover:border-red-400 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600 dark:hover:bg-red-900/40 dark:hover:text-red-300 dark:hover:border-red-600">
              ✓ Late Plate Requested
            </Button>
          ) : (
            <Button onClick={onLatePlate} disabled={isPast} variant="secondary" className="w-full sm:w-auto">
              Late Plate
            </Button>
          )}
          {user?.is_admin && (
            <Link to={`/app/admin/edit-meal/${meal.id}`}>
              <Button variant="secondary" className="w-full sm:w-auto">Edit</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
