import { Outlet, NavLink, Link } from "react-router-dom";
import Button from "../../components/ui/Button";

export default function Admin() {
  const adminNav = [
    { to: "meals", label: "Meals" },
    { to: "reviews", label: "Reviews" },
    { to: "attendance", label: "Attendance" },
    { to: "users", label: "Users" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Admin Dashboard</h1>
          <p className="text-text-secondary dark:text-gray-400 mt-1">Manage meals, reviews, and attendance.</p>
        </div>
        <Link to="/app/home">
          <Button variant="secondary">Back to App</Button>
        </Link>
      </div>
      
      <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-2 flex flex-wrap gap-2 dark:bg-slate-800/80 dark:border-slate-700">
        {adminNav.map(item => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <Button variant={isActive ? 'primary' : 'secondary'} className="w-full sm:w-auto">
                {item.label}
              </Button>
            )}
          </NavLink>
        ))}
      </div>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
