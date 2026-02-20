import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import { ChevronDown } from 'lucide-react';
import Button from '../../components/ui/Button';

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  denied: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

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
        const key = plate.meal_dish_name || 'Unknown Meal';
        if (!acc[key]) acc[key] = [];
        acc[key].push(plate);
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

  const handleStatusUpdate = async (plateId, newStatus) => {
    // Optimistic update
    setLatePlatesByMeal(prev => {
      const updated = {};
      for (const [key, plates] of Object.entries(prev)) {
        updated[key] = plates.map(p => p.id === plateId ? { ...p, status: newStatus } : p);
      }
      return updated;
    });
    try {
      await api(`/api/admin/late-plates/${plateId}/status`, {
        method: 'PUT',
        body: { status: newStatus },
      });
    } catch (err) {
      setError(err.message || 'Failed to update status.');
      fetchLatePlates(); // revert on error
    }
  };

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
                  {mealName}
                  {plates[0]?.meal && (
                    <span className="ml-2 text-sm font-normal text-text-secondary dark:text-gray-400">
                      ({plates[0].meal.meal_type} · {new Date(plates[0].meal.meal_date).toLocaleDateString(undefined, { weekday: 'long' })})
                    </span>
                  )}
                  <span className="ml-2 text-sm font-normal text-text-secondary dark:text-gray-400">
                    ({plates.length} request{plates.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <ChevronDown className="w-5 h-5 text-text-secondary dark:text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <ul className="space-y-3 mt-4">
                {plates.map(plate => (
                  <li key={plate.id} className="p-3 bg-white/80 dark:bg-slate-600 rounded-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-text-primary dark:text-white">{plate.user_name}</p>
                        {plate.pickup_time && (
                          <p className="text-sm text-text-secondary dark:text-gray-300 mt-0.5">
                            Pickup: <span className="font-medium">{plate.pickup_time}</span>
                          </p>
                        )}
                        {plate.notes && (
                          <p className="text-sm text-text-secondary dark:text-gray-300 mt-0.5">Notes: {plate.notes}</p>
                        )}
                        <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                          Requested at {new Date(plate.request_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[plate.status] || STATUS_STYLES.pending}`}>
                          {plate.status}
                        </span>
                        {plate.status !== 'approved' && (
                          <Button
                            className="text-xs py-1 px-2"
                            onClick={() => handleStatusUpdate(plate.id, 'approved')}
                          >
                            Approve
                          </Button>
                        )}
                        {plate.status !== 'denied' && (
                          <Button
                            variant="danger"
                            className="text-xs py-1 px-2"
                            onClick={() => handleStatusUpdate(plate.id, 'denied')}
                          >
                            Deny
                          </Button>
                        )}
                        {plate.status !== 'pending' && (
                          <Button
                            variant="secondary"
                            className="text-xs py-1 px-2"
                            onClick={() => handleStatusUpdate(plate.id, 'pending')}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
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
