import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '../../lib/api';
import Button from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, XCircle, Clock, UserX } from 'lucide-react';

export default function MealAttendanceDetails() {
  const { mealId } = useParams();
  const navigate = useNavigate();
  const [mealDetails, setMealDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api(`/api/admin/meals/${mealId}/attendance-details`);
        setMealDetails(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch attendance details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [mealId]);

  if (loading) return <div className="text-center text-text-secondary dark:text-gray-400">Loading attendance details...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;
  if (!mealDetails) return <div className="text-center text-text-secondary dark:text-gray-400">No details found.</div>;

  const {
    meal,
    confirmed_attendees = [],
    no_shows = [],
    unconfirmed_attendees = [],
    non_attendees = [],
    confirmed_count = 0,
    no_show_count = 0,
    unconfirmed_count = 0,
    non_attendee_count = 0,
    total_users = 0,
  } = mealDetails;

  const isPast = new Date(meal.meal_date) < new Date();

  const UserList = ({ users, emptyText }) =>
    users.length === 0 ? (
      <p className="text-sm text-text-secondary dark:text-gray-500 italic">{emptyText}</p>
    ) : (
      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.id} className="text-sm text-text-primary dark:text-gray-300">{u.name}</li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate('/app/admin/attendance')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">{meal.dish_name}</h1>
          <p className="text-text-secondary dark:text-gray-400">
            {new Date(meal.meal_date).toLocaleDateString()} · {meal.meal_type}
          </p>
        </div>
      </div>

      {meal.image_url && (
        <img
          src={meal.image_url.startsWith('http') ? meal.image_url : `${BASE_URL}${meal.image_url}`}
          alt={meal.dish_name}
          className="w-full h-48 object-cover rounded-xl shadow-md"
        />
      )}

      {/* Summary row */}
      <div className={`grid gap-4 text-center ${isPast ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
        {isPast && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/30">
            <p className="text-3xl font-bold text-green-700 dark:text-green-400">{confirmed_count}</p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1">Confirmed</p>
          </div>
        )}
        {isPast && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30">
            <p className="text-3xl font-bold text-red-700 dark:text-red-400">{no_show_count}</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">No-Show</p>
          </div>
        )}
        {isPast && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/30">
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{unconfirmed_count}</p>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">Unconfirmed</p>
          </div>
        )}
        {!isPast && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {confirmed_count + unconfirmed_count}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">Attending</p>
          </div>
        )}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">{non_attendee_count}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Not Attending</p>
        </div>
      </div>
      <p className="text-sm text-center text-text-secondary dark:text-gray-400">
        {total_users} total members
      </p>

      {/* Detail lists */}
      <div className={`grid grid-cols-1 gap-4 ${isPast ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
        {isPast && (
          <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-5 dark:bg-slate-800/80 dark:border-slate-700">
            <h3 className="text-base font-bold text-text-primary dark:text-white flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-green-500" /> Confirmed ({confirmed_count})
            </h3>
            <UserList users={confirmed_attendees} emptyText="No confirmed attendees yet." />
          </div>
        )}
        {isPast && (
          <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-5 dark:bg-slate-800/80 dark:border-slate-700">
            <h3 className="text-base font-bold text-text-primary dark:text-white flex items-center gap-2 mb-3">
              <XCircle size={18} className="text-red-500" /> No-Show ({no_show_count})
            </h3>
            <UserList users={no_shows} emptyText="No no-shows recorded." />
          </div>
        )}
        {isPast && (
          <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-5 dark:bg-slate-800/80 dark:border-slate-700">
            <h3 className="text-base font-bold text-text-primary dark:text-white flex items-center gap-2 mb-3">
              <Clock size={18} className="text-amber-500" /> Unconfirmed ({unconfirmed_count})
            </h3>
            <UserList users={unconfirmed_attendees} emptyText="All attendees have responded." />
          </div>
        )}
        {!isPast && (
          <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-5 dark:bg-slate-800/80 dark:border-slate-700">
            <h3 className="text-base font-bold text-text-primary dark:text-white flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-green-500" /> Attending ({confirmed_count + unconfirmed_count})
            </h3>
            <UserList users={[...confirmed_attendees, ...unconfirmed_attendees]} emptyText="No attendees yet." />
          </div>
        )}
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-5 dark:bg-slate-800/80 dark:border-slate-700">
          <h3 className="text-base font-bold text-text-primary dark:text-white flex items-center gap-2 mb-3">
            <UserX size={18} className="text-gray-400" /> Not Attending ({non_attendee_count})
          </h3>
          <UserList users={non_attendees} emptyText="Everyone is attending." />
        </div>
      </div>
    </div>
  );
}
