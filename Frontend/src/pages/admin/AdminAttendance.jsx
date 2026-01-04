import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function AdminAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { attendance: fetchedAttendance } = await api('/api/admin/attendance');
        setAttendance(fetchedAttendance);
      } catch (err) {
        setError(err.message || 'Failed to fetch attendance.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center text-text-secondary">Loading attendance records...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      {attendance.length === 0 ? (
        <div className="text-center text-text-secondary py-8 dark:text-gray-400">No attendance records found.</div>
      ) : (
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-4 dark:bg-slate-800/80 dark:border-slate-700">
          <ul className="divide-y divide-border-light dark:divide-slate-700">
            {attendance.map((record) => (
              <li key={record.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-text-primary dark:text-white">{record.user.name}</p>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    Attended {record.meal.dish_name} on {new Date(record.meal.meal_date).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-text-secondary dark:text-gray-400">{new Date(record.attended_at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
