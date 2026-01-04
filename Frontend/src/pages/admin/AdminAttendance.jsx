import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Calendar, Users } from 'lucide-react';

export default function AdminAttendance() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Fetch all meals to display them as a list
        const { meals: fetchedMeals } = await api('/api/menu');
        setMeals(fetchedMeals);
      } catch (err) {
        setError(err.message || 'Failed to fetch meals.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center text-text-secondary dark:text-gray-400">Loading meals...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {meals.length === 0 ? (
        <div className="text-center text-text-secondary py-8 dark:text-gray-400">No meals found.</div>
      ) : (
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-4 dark:bg-slate-800/80 dark:border-slate-700">
          <h2 className="text-xl font-bold text-text-primary mb-4 dark:text-white">Meals for Attendance Tracking</h2>
          <div className="space-y-4">
            {meals.map((meal) => (
              <div key={meal.id} className="flex items-center justify-between p-3 rounded-lg border border-border-light dark:border-slate-700 bg-white/50 dark:bg-slate-700/50">
                <div>
                  <p className="font-semibold text-text-primary dark:text-white">{meal.dish_name} ({meal.meal_type})</p>
                  <p className="text-sm text-text-secondary dark:text-gray-400 flex items-center gap-1">
                    <Calendar size={14} /> {new Date(meal.meal_date).toLocaleDateString()}
                  </p>
                </div>
                <Link to={`/app/admin/attendance/${meal.id}`}>
                  <Button variant="secondary" className="py-1.5 px-3 text-sm">
                    <Users size={16} className="mr-2" /> View Attendance
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
