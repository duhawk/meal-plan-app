
import { Calendar, Star, CheckCircle, Users } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../lib/api';
import Button from './ui/Button';

export default function MealCard({ meal, onAttend, onReview, onLatePlate }) {
  const { user } = useUser();
  const mealDate = new Date(meal.meal_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = mealDate.toDateString() === today.toDateString();
  const isPast = mealDate < today;

  const imageUrl = meal.image_url ? `${BASE_URL}${meal.image_url}` : null;

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
          {user?.is_admin && (
            <div className="flex items-center gap-2">
              <Users size={14} />
              <span>{meal.attendance_count} Attending</span>
            </div>
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
            Review
          </Button>
          <Button onClick={onLatePlate} variant="secondary" className="w-full sm:w-auto">
            Late Plate
          </Button>
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
