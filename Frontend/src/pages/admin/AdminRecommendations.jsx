import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react'; // Import Trash2 icon

export default function AdminRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    if (user && (user.is_admin || user.is_owner)) {
      fetchRecommendations();
    } else {
      setError('You do not have permission to view this page.');
      setLoading(false);
    }
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await api('/api/admin/recommendations');
      setRecommendations(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recommendation?')) {
      try {
        await api(`/api/admin/recommendations/${id}`, { method: 'DELETE' });
        setRecommendations(recommendations.filter((rec) => rec.id !== id));
        // Optionally, show a success message
      } catch (err) {
        setError(err.message || 'Failed to delete recommendation.');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading recommendations...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-text-primary dark:text-gray-300 mb-6">Meal Recommendations</h1>
      {recommendations.length === 0 ? (
        <p className="text-text-secondary">No recommendations submitted yet.</p>
      ) : (
        <div className="overflow-x-auto bg-surface rounded-lg shadow-md dark:bg-slate-800/80 dark:border-slate-700">
          <table className="min-w-full divide-y divide-border-light">
            <thead className="bg-background-light">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-white uppercase tracking-wider">
                  Meal Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-white uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-white uppercase tracking-wider">
                  Link
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-white uppercase tracking-wider">
                  Recommended By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-white uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {recommendations.map((rec) => (
                <tr key={rec.id} className="hover:bg-background-light">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-white">
                    {rec.meal_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-white">
                    {rec.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-white">
                    {rec.link ? (
                      <a href={rec.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View Link
                      </a>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-white">
                    {rec.user ? rec.user.name : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-white">
                    {format(new Date(rec.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
