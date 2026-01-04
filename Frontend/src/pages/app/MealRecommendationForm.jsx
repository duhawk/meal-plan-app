import Button from '../../components/ui/Button';

export default function MealRecommendationForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // a lert("Recommendation submitted! (Functionality to be implemented)");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Meal Recommendation</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">Have an idea for a meal? Let us know!</p>
      </div>
      <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-8 dark:bg-slate-800/80 dark:border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mealName" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Meal Name</label>
            <input type="text" id="mealName" className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Description / Recipe</label>
            <textarea id="description" rows="4" className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"></textarea>
          </div>
          <div className="pt-2">
            <Button type="submit" className="w-full sm:w-auto">Submit Recommendation</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
