// Meal_plan/Frontend/src/components/MobileShell.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function MobileShell({ onLogout, currentUser }) {
  const navigate = useNavigate();
  const safeName = currentUser?.first_name || currentUser?.name || "Member";

  const handleLogout = () => {
    localStorage.removeItem("token");
    onLogout?.();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-lg">Fraternity Meals</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Hi, {safeName}</span>
            <button onClick={handleLogout} className="rounded-xl px-3 py-1.5 text-sm border hover:bg-gray-100 active:scale-[.98]">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-sm flex-1 px-4 py-4">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 z-10 w-full border-t bg-white">
        <div className="mx-auto max-w-screen-sm grid grid-cols-3 text-sm">
          <NavLink to="/app/home" className={({isActive}) => `py-2.5 text-center ${isActive ? 'font-semibold' : 'text-gray-600'}`}>Home</NavLink>
          <NavLink to="/app/menu" className={({isActive}) => `py-2.5 text-center ${isActive ? 'font-semibold' : 'text-gray-600'}`}>Menu</NavLink>
          <NavLink to="/app/reviews" className={({isActive}) => `py-2.5 text-center ${isActive ? 'font-semibold' : 'text-gray-600'}`}>Reviews</NavLink>
        </div>
      </nav>
    </div>
  );
}
