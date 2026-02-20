import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Button from "./ui/Button";
import { Home, Utensils, Calendar, PenSquare, Settings } from 'lucide-react';
import ThemeToggle from "./ui/ThemeToggle";
import { useUser } from "../contexts/UserContext";
import { BASE_URL, api } from "../lib/api";

export default function MobileShell() {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const safeName = user?.first_name || user?.name || "Member";
  const [pendingCount, setPendingCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!user?.is_admin) return;

    const fetchCount = async () => {
      try {
        const data = await api('/api/admin/late-plates/pending-count');
        setPendingCount(data.count ?? 0);
      } catch {
        // silently ignore
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user?.is_admin]);

  const navLinks = [
    { to: "/app/home", label: "Home", icon: Home },
    { to: "/app/menu", label: "Menu", icon: Utensils },
    { to: "/app/past-meals", label: "Past Meals", icon: Calendar },
    { to: "/app/recommend", label: "Recommend", icon: PenSquare },
  ];

  if (user?.is_admin) {
    navLinks.push({ to: "/app/admin", label: "Admin", icon: Settings, badge: pendingCount });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-start to-gradient-end text-text-primary flex flex-col dark:from-slate-900 dark:to-slate-800 dark:text-gray-200">
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-lg border-b border-border-light/50 dark:bg-slate-900/80 dark:border-slate-800/50">
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <img src={`${BASE_URL}/uploads/lightmode_logo.png`} alt="Logo" className="h-8 w-8 rounded-full object-cover ml-2 dark:hidden" />
            <div className="h-8 w-8 rounded-full overflow-hidden ml-2 hidden dark:flex items-center justify-center flex-shrink-0">
              <img src={`${BASE_URL}/uploads/darkmode_logo.png`} alt="Logo" className="w-full h-full object-cover" style={{ objectPosition: 'center 60%', transform: 'scaleY(1.1)' }} />
            </div>
            <div className="font-bold text-text-primary dark:text-white">Ordo</div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/app/profile" className="text-sm font-medium text-primary hover:underline">
              {safeName}
            </Link>
            <Button onClick={handleLogout} variant="secondary" className="py-1.5 px-3 text-xs">Logout</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 z-20 w-full border-t bg-surface/80 backdrop-blur-lg border-border-light/50 dark:bg-slate-900/80 dark:border-slate-800/50">
        <div className="mx-auto max-w-screen-sm flex justify-around text-sm">
          {navLinks.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} className={({isActive}) => `py-2.5 text-center ${isActive ? 'text-primary' : 'text-text-secondary dark:text-gray-400'}`}>
              <div className="flex flex-col items-center gap-0.5 relative">
                <div className="relative">
                  <Icon size={20} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{label}</span>
              </div>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
