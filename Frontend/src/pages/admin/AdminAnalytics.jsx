import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Users, Utensils, Star, MessageSquare } from 'lucide-react';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const result = await api('/api/admin/analytics');
        setData(result);
      } catch (e) {
        setErr(e.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center text-text-secondary dark:text-gray-400 py-8">Loading analytics...</div>;
  if (err) return <div className="text-center text-red-500 py-8">{err}</div>;
  if (!data) return null;

  const { summary, attendance_trend, popular_meals, highest_rated, lowest_rated } = data;

  const maxTrendValue = attendance_trend?.length ? Math.max(...attendance_trend.map(w => w.avg_attendees), 1) : 1;

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Members', value: summary.total_members, icon: Users, color: 'text-blue-500' },
          { label: 'Meals', value: summary.total_meals, icon: Utensils, color: 'text-amber-500' },
          { label: 'Reviews', value: summary.total_reviews, icon: MessageSquare, color: 'text-purple-500' },
          { label: 'Avg Rating', value: summary.avg_rating != null ? summary.avg_rating.toFixed(1) : '—', icon: Star, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-4 dark:bg-slate-800/80 dark:border-slate-700">
            <div className={`mb-1 ${color}`}><Icon size={20} /></div>
            <p className="text-2xl font-bold text-text-primary dark:text-white">{value}</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Attendance trend */}
      {attendance_trend?.length > 0 && (
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-6 dark:bg-slate-800/80 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Weekly Attendance Trend (last 8 weeks)</h2>
          <div className="space-y-2">
            {attendance_trend.map((week) => (
              <div key={week.week} className="flex items-center gap-3">
                <span className="text-xs text-text-secondary dark:text-gray-400 w-24 shrink-0">
                  {new Date(week.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${(week.avg_attendees / maxTrendValue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-text-primary dark:text-white w-8 text-right">
                  {week.avg_attendees}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular meals */}
      {popular_meals?.length > 0 && (
        <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-6 dark:bg-slate-800/80 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Top 10 Meals by Attendance</h2>
          <div className="space-y-2">
            {popular_meals.map((meal, i) => (
              <div key={meal.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-secondary dark:text-gray-400 w-5 text-right">{i + 1}.</span>
                <span className="flex-1 text-sm text-text-primary dark:text-white truncate">{meal.dish_name}</span>
                <div className="w-32 bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full"
                    style={{ width: `${Math.min(meal.attendance_pct, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-text-primary dark:text-white w-10 text-right">
                  {meal.attendance_pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ratings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {highest_rated?.length > 0 && (
          <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-6 dark:bg-slate-800/80 dark:border-slate-700">
            <h2 className="text-base font-semibold text-text-primary dark:text-white mb-3">Top 5 Highest Rated</h2>
            <ol className="space-y-2">
              {highest_rated.map((meal, i) => (
                <li key={meal.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary dark:text-white truncate flex-1">{i + 1}. {meal.dish_name}</span>
                  <span className="ml-2 text-yellow-500 font-semibold">★ {meal.avg_rating.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {lowest_rated?.length > 0 && (
          <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-6 dark:bg-slate-800/80 dark:border-slate-700">
            <h2 className="text-base font-semibold text-text-primary dark:text-white mb-3">Bottom 5 Lowest Rated</h2>
            <ol className="space-y-2">
              {lowest_rated.map((meal, i) => (
                <li key={meal.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary dark:text-white truncate flex-1">{i + 1}. {meal.dish_name}</span>
                  <span className="ml-2 text-red-400 font-semibold">★ {meal.avg_rating.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
