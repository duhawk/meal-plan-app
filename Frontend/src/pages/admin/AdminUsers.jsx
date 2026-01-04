import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import Button from '../../components/ui/Button';
import { useUser } from '../../contexts/UserContext';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser, loading: loadingUserContext } = useUser();

  console.log("AdminUsers: currentUser", currentUser);
  console.log("AdminUsers: currentUser?.is_owner", currentUser?.is_owner);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { users: fetchedUsers } = await api('/api/admin/users');
      setUsers(fetchedUsers);
    } catch (err) {
      setError(err.message || 'Failed to fetch users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await api(`/api/admin/users/${userId}`, { method: 'DELETE' });
        fetchUsers(); // Refresh the list
      } catch (err) {
        setError(err.message || 'Failed to delete user.');
      }
    }
  };

  const handleToggleAdmin = async (userId, currentAdminStatus) => {
    if (window.confirm(`Are you sure you want to ${currentAdminStatus ? 'demote' : 'promote'} this user?`)) {
      try {
        await api(`/api/admin/users/${userId}/role`, {
          method: 'PUT',
          body: { is_admin: !currentAdminStatus },
        });
        fetchUsers(); // Refresh the list
      } catch (err) {
        setError(err.message || 'Failed to update user role.');
      }
    }
  };

  if (loadingUsers || loadingUserContext) return <div className="text-center text-text-secondary dark:text-gray-400">Loading users...</div>;
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
              {currentUser?.is_owner && <th className="p-3 text-sm font-semibold text-text-secondary dark:text-gray-400">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-border-light dark:border-slate-800">
                <td className="p-3 text-text-primary dark:text-white">{user.name}</td>
                <td className="p-3 text-text-secondary dark:text-gray-300">{user.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_owner
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                      : user.is_admin 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300'
                  }`}>
                    {user.is_owner ? 'Owner' : user.is_admin ? 'Admin' : 'Member'}
                  </span>
                </td>
                <td className="p-3 text-text-secondary dark:text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                {currentUser?.is_owner && (
                  <td className="p-3 flex gap-2">
                    {!user.is_owner && ( // Owners cannot delete or demote themselves or other owners
                      <>
                        <Button 
                          variant={user.is_admin ? 'secondary' : 'primary'} 
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          className="py-1 px-2 text-xs"
                        >
                          {user.is_admin ? 'Demote' : 'Promote to Admin'}
                        </Button>
                        <Button 
                          variant="danger" 
                          onClick={() => handleDeleteUser(user.id)}
                          className="py-1 px-2 text-xs"
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
