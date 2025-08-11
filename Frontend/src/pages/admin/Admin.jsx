import { Outlet, NavLink } from "react-router-dom";

export default function Admin() {
  return (
    <div className="max-w-screen-sm mx-auto">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="mt-3 flex gap-3 text-sm">
        <NavLink to="/admin/meals" className={({isActive}) => `px-3 py-1.5 rounded-xl border ${isActive ? 'bg-gray-900 text-white' : ''}`}>Meals</NavLink>
        <NavLink to="/admin/reviews" className={({isActive}) => `px-3 py-1.5 rounded-xl border ${isActive ? 'bg-gray-900 text-white' : ''}`}>Reviews</NavLink>
      </div>
      <div className="mt-6"><Outlet /></div>
    </div>
  );
}
