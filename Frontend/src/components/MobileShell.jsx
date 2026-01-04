import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Button from "./ui/Button";
import { Home, Utensils, Calendar, PenSquare, Settings } from 'lucide-react';
import ThemeToggle from "./ui/ThemeToggle";
import { useUser } from "../contexts/UserContext";

export default function MobileShell() {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const safeName = user?.first_name || user?.name || "Member";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/app/home", label: "Home", icon: Home },
    { to: "/app/menu", label: "Menu", icon: Utensils },
    { to: "/app/past-meals", label: "Past Meals", icon: Calendar },
    { to: "/app/recommend", label: "Recommend", icon: PenSquare },
  ];

  if (user?.is_admin) {
    navLinks.push({ to: "/app/admin", label: "Admin", icon: Settings });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-start to-gradient-end text-text-primary flex flex-col dark:from-slate-900 dark:to-slate-800 dark:text-gray-200">
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-lg border-b border-border-light/50 dark:bg-slate-900/80 dark:border-slate-800/50">
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="h-7 w-7 rounded-lg bg-primary ml-2" />
            <div className="font-bold text-text-primary dark:text-white">Fraternity Meals</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary dark:text-gray-400">Hi, {safeName}</span>
            <Button onClick={handleLogout} variant="secondary" className="py-1.5 px-3 text-xs">Logout</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 z-20 w-full border-t bg-surface/80 backdrop-blur-lg border-border-light/50 dark:bg-slate-900/80 dark:border-slate-800/50">
        <div className="mx-auto max-w-screen-sm flex justify-around text-sm">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({isActive}) => `py-2.5 text-center ${isActive ? 'text-primary' : 'text-text-secondary dark:text-gray-400'}`}>
              <div className="flex flex-col items-center gap-0.5">
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </div>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
