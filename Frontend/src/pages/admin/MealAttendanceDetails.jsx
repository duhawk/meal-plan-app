import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '../../lib/api';
import Button from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function MealAttendanceDetails() {
  const { mealId } = useParams();
  const navigate = useNavigate();

  const [mealDetails, setMealDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAttendanceDetails = async () => {
      try {
        setLoading(true);
        const data = await api(`/api/admin/meals/${mealId}/attendance-details`);
        setMealDetails(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch attendance details.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceDetails();
  }, [mealId]);

  if (loading) return <div className="text-center text-text-secondary dark:text-gray-400">Loading attendance details...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;
  if (!mealDetails) return <div className="text-center text-text-secondary dark:text-gray-400">No details found.</div>;

  const { meal, attending_users, not_attending_users, attending_count, not_attending_count, total_users } = mealDetails;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate('/app/admin/attendance')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">{meal.dish_name}</h1>
          <p className="text-text-secondary dark:text-gray-400">{new Date(meal.meal_date).toLocaleDateString()} - {meal.meal_type}</p>
        </div>
      </div>

      {meal.image_url && (
        <img src={`${BASE_URL}${meal.image_url}`} alt={meal.dish_name} className="w-full h-48 object-cover rounded-xl shadow-md" />
      )}

      <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-6 dark:bg-slate-800/80 dark:border-slate-700">
        <h2 className="text-xl font-bold text-text-primary mb-4 dark:text-white">Attendance Summary</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/30">
            <p className="text-3xl font-bold text-green-700 dark:text-green-400">{attending_count}</p>
            <p className="text-sm text-green-600 dark:text-green-300">Attending</p>
          </div>
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30">
            <p className="text-3xl font-bold text-red-700 dark:text-red-400">{not_attending_count}</p>
            <p className="text-sm text-red-600 dark:text-red-300">Not Attending</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary dark:text-gray-400 mt-4 text-center">Total users: {total_users}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-6 dark:bg-slate-800/80 dark:border-slate-700">
          <h3 className="text-lg font-bold text-text-primary mb-3 dark:text-white flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" /> Attending ({attending_users.length})
          </h3>
          <ul className="space-y-2">
            {attending_users.map(user => (
              <li key={user.id} className="text-text-primary dark:text-gray-300">{user.name} ({user.email})</li>
            ))}
          </ul>
        </div>

        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-6 dark:bg-slate-800/80 dark:border-slate-700">
          <h3 className="text-lg font-bold text-text-primary mb-3 dark:text-white flex items-center gap-2">
            <XCircle size={20} className="text-red-500" /> Not Attending ({not_attending_users.length})
          </h3>
          <ul className="space-y-2">
            {not_attending_users.map(user => (
              <li key={user.id} className="text-text-primary dark:text-gray-300">{user.name} ({user.email})</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
