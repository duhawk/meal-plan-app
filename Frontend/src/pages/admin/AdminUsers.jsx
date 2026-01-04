import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { users: fetchedUsers } = await api('/api/admin/users');
        setUsers(fetchedUsers);
      } catch (err) {
        setError(err.message || 'Failed to fetch users.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center text-text-secondary dark:text-gray-400">Loading users...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-6 dark:bg-slate-800/80 dark:border-slate-700">
      <h2 className="text-2xl font-bold text-text-primary mb-4 dark:text-white">All Users</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-light dark:border-slate-700">
              <th className="p-3 text-sm font-semibold text-text-secondary dark:text-gray-400">Name</th>
              <th className="p-3 text-sm font-semibold text-text-secondary dark:text-gray-400">Email</th>
              <th className="p-3 text-sm font-semibold text-text-secondary dark:text-gray-400">Role</th>
              <th className="p-3 text-sm font-semibold text-text-secondary dark:text-gray-400">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-border-light dark:border-slate-800">
                <td className="p-3 text-text-primary dark:text-white">{user.name}</td>
                <td className="p-3 text-text-secondary dark:text-gray-300">{user.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_admin 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300'
                  }`}>
                    {user.is_admin ? 'Admin' : 'Member'}
                  </span>
                </td>
                <td className="p-3 text-text-secondary dark:text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
