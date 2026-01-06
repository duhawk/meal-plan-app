import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import { ChevronDown } from 'lucide-react';

export default function AdminLatePlates() {
  const [latePlatesByMeal, setLatePlatesByMeal] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser, loading: loadingUserContext } = useUser();

  const fetchLatePlates = async () => {
    try {
      setLoading(true);
      const data = await api('/api/admin/late-plates/today');
      const grouped = data.late_plates.reduce((acc, plate) => {
        const mealName = plate.meal_dish_name || 'Unknown Meal';
        if (!acc[mealName]) {
          acc[mealName] = [];
        }
        acc[mealName].push(plate);
        return acc;
      }, {});
      setLatePlatesByMeal(grouped);
    } catch (err) {
      setError(err.message || 'Failed to fetch late plate requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingUserContext && (!currentUser || (!currentUser.is_admin && !currentUser.is_owner))) {
      setError('You do not have permission to view this page.');
      setLoading(false);
      return;
    }
    if (currentUser && (currentUser.is_admin || currentUser.is_owner)) {
      fetchLatePlates();
    }
  }, [currentUser, loadingUserContext]);

  if (loading || loadingUserContext) return <div className="text-center text-text-secondary dark:text-gray-400">Loading late plate requests...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-6 dark:bg-slate-800/80 dark:border-slate-700">
      <h2 className="text-2xl font-bold text-text-primary mb-4 dark:text-white">Today's Late Plate Requests</h2>
      {Object.keys(latePlatesByMeal).length === 0 ? (
        <p className="text-text-secondary dark:text-gray-400">No late plate requests for today.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(latePlatesByMeal).map(([mealName, plates]) => (
            <details key={mealName} className="p-4 bg-white/50 dark:bg-slate-700/50 rounded-lg border border-border-light dark:border-slate-700 group">
              <summary className="flex justify-between items-center cursor-pointer">
                <h3 className="font-semibold text-lg text-text-primary dark:text-white">
                  {mealName} {plates[0].meal ? `(${plates[0].meal.meal_type} - ${new Date(plates[0].meal.meal_date).toLocaleDateString(undefined, { weekday: 'long' })})` : ''}
                  <span className="ml-2 text-sm font-normal text-text-secondary dark:text-gray-400">({plates.length} late plates)</span>
                </h3>
                <ChevronDown className="w-5 h-5 text-text-secondary dark:text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <ul className="space-y-2 mt-4">
                {plates.map(plate => (
                  <li key={plate.id} className="p-3 bg-white/80 dark:bg-slate-600 rounded-md">
                    <p className="font-semibold text-text-primary dark:text-white">{plate.user_name}</p>
                    {plate.notes && <p className="text-sm text-text-secondary dark:text-gray-300 mt-1">Notes: {plate.notes}</p>}
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">Requested at {new Date(plate.request_time).toLocaleTimeString()}</p>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
