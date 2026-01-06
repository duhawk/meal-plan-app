import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import { api } from '../../lib/api'; // Import the api utility

export default function MealRecommendationForm() {
  const [mealName, setMealName] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await api('/api/recommendations', {
        method: 'POST',
        body: { meal_name: mealName, description, link },
      });
      setMessage(response.message || 'Recommendation submitted successfully!');
      setMealName('');
      setDescription('');
      setLink('');
    } catch (err) {
      setError(err.message || 'Failed to submit recommendation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Meal Recommendation</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">Have an idea for a meal? Let us know!</p>
      </div>
      <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-8 dark:bg-slate-800/80 dark:border-slate-700">
        {message && <p className="text-green-600 text-sm text-center mb-4">{message}</p>}
        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mealName" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Meal Name</label>
            <input
              type="text"
              id="mealName"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              required
              className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Description / Recipe</label>
            <textarea
              id="description"
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            ></textarea>
          </div>
          <div>
            <label htmlFor="link" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Link (Optional)</label>
            <input
              type="url"
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              placeholder="e.g., https://www.example.com/recipe"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Recommendation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
