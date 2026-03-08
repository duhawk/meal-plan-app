import { useState, useEffect, useMemo } from 'react';
import { api, BASE_URL } from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import { Star, Users, ChevronDown, ChevronUp, Trash2, TrendingUp } from 'lucide-react';
import Button from '../../components/ui/Button';

const MEMBER_SORT_OPTIONS = [
  { value: 'avg_rating', label: 'Avg Rating' },
  { value: 'name', label: 'Name' },
];

const ADMIN_SORT_OPTIONS = [
  { value: 'zscore', label: 'Top Rated' },
  { value: 'avg_rating', label: 'Avg Rating' },
  { value: 'times_served', label: 'Times Served' },
  { value: 'name', label: 'Name' },
];

export default function PastMeals() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('avg_rating');
  const { user } = useUser();
  const [expandedMealId, setExpandedMealId] = useState(null);

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

  const sortedMeals = useMemo(() => {
    const copy = [...meals];
    copy.sort((a, b) => {
      if (sortBy === 'zscore') {
        const az = a.rating_zscore ?? -Infinity;
        const bz = b.rating_zscore ?? -Infinity;
        return bz - az;
      }
      if (sortBy === 'avg_rating') {
        const ar = a.avg_rating ?? -Infinity;
        const br = b.avg_rating ?? -Infinity;
        return br - ar;
      }
      if (sortBy === 'times_served') {
        return (b.past_occurrences?.length ?? 0) - (a.past_occurrences?.length ?? 0);
      }
      return a.dish_name.localeCompare(b.dish_name);
    });
    return copy;
  }, [meals, sortBy]);

  if (loading) return <div className="text-center text-text-secondary dark:text-gray-400">Loading past meals...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Past Meals</h1>
          <p className="text-text-secondary mt-1 dark:text-gray-400">Review and see details of previous meals.</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2">
            {['All', 'Lunch', 'Dinner'].map(option => (
              <button
                key={option}
                onClick={() => { setFilter(option); setExpandedMealId(null); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === option
                    ? option === 'Lunch'
                      ? 'bg-amber-500 text-white'
                      : option === 'Dinner'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-primary text-white'
                    : 'bg-surface border border-border-light text-text-secondary dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary dark:text-gray-400">Sort:</span>
            <div className="flex gap-1">
              {(user?.is_admin || user?.is_owner ? ADMIN_SORT_OPTIONS : MEMBER_SORT_OPTIONS).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    sortBy === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border-light text-text-secondary dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {meals.length === 0 ? (
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-12 text-center dark:bg-slate-800/80 dark:border-slate-700">
          <p className="text-text-secondary dark:text-gray-400">No past meals found.</p>
        </div>
      ) : sortedMeals.every(m => filter !== 'All' && !m.past_occurrences?.some(o => o.meal_type === filter)) ? (
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-12 text-center dark:bg-slate-800/80 dark:border-slate-700">
          <p className="text-text-secondary dark:text-gray-400">No {filter} meals found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMeals.flatMap((meal) => {
            const filteredOccurrences = filter === 'All'
              ? meal.past_occurrences
              : meal.past_occurrences?.filter(o => o.meal_type === filter);
            if (!filteredOccurrences?.length) return [];
            const isExpanded = expandedMealId === meal.dish_name;
            const avgAttendance = filteredOccurrences.length
              ? (filteredOccurrences.reduce((sum, o) => sum + o.attendance, 0) / filteredOccurrences.length).toFixed(2)
              : 0;
            return [(
              <div key={meal.dish_name} className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg dark:bg-slate-800/80 dark:border-slate-700">
                <div className="p-5 cursor-pointer" onClick={() => toggleExpand(meal.dish_name)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-text-primary dark:text-white">{meal.dish_name}</h3>
                      <p className="text-sm text-text-secondary dark:text-gray-400 mt-0.5">
                        Served {filteredOccurrences.length}×
                        {user?.is_admin && <span> · Avg attendance: {avgAttendance}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {meal.avg_rating != null ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span className="text-sm font-semibold text-text-primary dark:text-white">{meal.avg_rating.toFixed(1)}</span>
                            <span className="text-xs text-text-secondary dark:text-gray-400">({meal.review_count})</span>
                          </div>
                          {meal.rating_zscore != null && (
                            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              meal.rating_zscore >= 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : meal.rating_zscore <= -1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              <TrendingUp size={10} />
                              {meal.rating_zscore > 0 ? '+' : ''}{meal.rating_zscore.toFixed(2)}σ
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-text-secondary dark:text-gray-500 italic">No reviews</span>
                      )}
                      {isExpanded ? <ChevronUp size={18} className="text-text-secondary dark:text-gray-400" /> : <ChevronDown size={18} className="text-text-secondary dark:text-gray-400" />}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-6 border-t border-border-light dark:border-slate-700">
                    {meal.image_url && (
                      <img src={`${BASE_URL}${meal.image_url}`} alt={meal.dish_name} className="w-full h-48 object-cover rounded-md mb-4" />
                    )}
                    <p className="text-text-secondary dark:text-gray-300 mb-4">{meal.description}</p>
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-text-primary dark:text-white">Past Occurrences:</h4>
                      {filteredOccurrences.map((occurrence) => (
                        <div key={occurrence.id} className="flex items-center justify-between text-sm text-text-secondary dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <span>{new Date(occurrence.date).toLocaleDateString()}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${occurrence.meal_type === 'Lunch' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
                              {occurrence.meal_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {user?.is_admin && <span>Attendance: {occurrence.attendance}</span>}
                            {user?.is_admin && (
                              <Button variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteMeal(occurrence.id); }} className="py-1 px-2 text-xs">
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {user?.is_admin && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400 mt-2">
                        <Users size={14} />
                        <span>Avg Attendance: {avgAttendance}</span>
                        {meal.rating_std != null && (
                          <span className="ml-2">· Std Dev: {meal.rating_std.toFixed(2)}</span>
                        )}
                        {meal.sharpe_analog != null && (
                          <span>· Quality Score: {meal.sharpe_analog.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )];
          })}
        </div>
      )}
    </div>
  );
}
