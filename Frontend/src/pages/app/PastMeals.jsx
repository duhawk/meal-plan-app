export default function PastMeals() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Past Meals</h1>
        <p className="text-text-secondary mt-1 dark:text-gray-400">Review and see details of previous meals.</p>
      </div>
      <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-12 text-center dark:bg-slate-800/80 dark:border-slate-700">
        <p className="text-text-secondary dark:text-gray-400">Content for past meals will be displayed here.</p>
      </div>
    </div>
  );
}
