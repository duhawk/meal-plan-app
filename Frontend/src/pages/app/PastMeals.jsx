import { useState, useEffect } from 'react';
import { api, BASE_URL } from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import { Calendar, Users, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function PastMeals() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useUser();
  const [expandedMealId, setExpandedMealId] = useState(null); // State to track expanded meal

  const fetchPastMeals = async () => {
    try {
      setLoading(true);
      const { meals: fetchedMeals } = await api('/api/past-meals');
      setMeals(fetchedMeals);
    } catch (err) {
      setError(err.message || 'Failed to fetch past meals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastMeals();
  }, []);

  const toggleExpand = (mealId) => {
    setExpandedMealId(expandedMealId === mealId ? null : mealId);
  };

  const handleDeleteMeal = async (mealId) => {
    if (window.confirm("Are you sure you want to delete this past meal? This action cannot be undone.")) {
      try {
        await api(`/api/meals/${mealId}`, { method: 'DELETE' });
        fetchPastMeals(); // Refresh the list
      } catch (err) {
        setError(err.message || 'Failed to delete meal.');
      }
    }
  };

  if (loading) return <div className="text-center text-text-secondary dark:text-gray-400">Loading past meals...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Past Meals</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">Review and see details of previous meals.</p>
      </div>
      {meals.length === 0 ? (
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-12 text-center dark:bg-slate-800/80 dark:border-slate-700">
          <p className="text-text-secondary dark:text-gray-400">No past meals found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {meals.map((meal) => {
            const isExpanded = expandedMealId === meal.dish_name;
            return (
              <div key={meal.dish_name} className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg dark:bg-slate-800/80 dark:border-slate-700">
                <div className="p-6 cursor-pointer" onClick={() => toggleExpand(meal.dish_name)}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-text-primary dark:text-white">{meal.dish_name}</h3>
                    <div className="flex items-center gap-2">
                      {user?.is_admin && (
                        <Button variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteMeal(meal.id); }} className="py-1 px-2 text-xs">
                          <Trash2 size={16} />
                        </Button>
                      )}
                      {isExpanded ? <ChevronUp size={20} className="text-text-secondary dark:text-gray-400" /> : <ChevronDown size={20} className="text-text-secondary dark:text-gray-400" />}
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                    Appeared on {meal.past_occurrences?.length || 0} dates.
                    {user?.is_admin && <span> Average attendance: {meal.average_attendance}</span>}
                  </p>
                </div>
                {isExpanded && (
                  <div className="p-6 border-t border-border-light dark:border-slate-700">
                    {meal.image_url && (
                      <img src={`${BASE_URL}${meal.image_url}`} alt={meal.dish_name} className="w-full h-48 object-cover rounded-md mb-4" />
                    )}
                    <p className="text-text-secondary dark:text-gray-300 mb-4">{meal.description}</p>
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-text-primary dark:text-white">Past Occurrences:</h4>
                      {meal.past_occurrences && meal.past_occurrences.map((occurrence, index) => (
                        <div key={index} className="flex items-center justify-between text-sm text-text-secondary dark:text-gray-400">
                          <span>{new Date(occurrence.date).toLocaleDateString()}</span>
                          {user?.is_admin && <span>Attendance: {occurrence.attendance}</span>}
                        </div>
                      ))}
                    </div>
                    {user?.is_admin && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
                        <Users size={14} />
                        <span>Average Attendance: {meal.average_attendance}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
