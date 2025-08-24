// Meal_plan/Frontend/src/pages/Landing.jsx
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="text-xl font-extrabold tracking-tight">Fraternity Meals</div>
        <div className="flex gap-3">
          <Link to="/login" className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-100">Sign in </Link>
          <Link to="/register" className="px-4 py-2 text-sm rounded-xl bg-gray-900 text-white hover:opacity-90">Get started</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Meal plans built for<br className="hidden md:block" /> fraternities that scale.
            </h1>
            <p className="mt-4 text-gray-600 text-lg">
              Weekly menus, late plates, attendance, and reviews—all in a fast, mobile-first experience.
              Role-based access and access-code sign-in make adding new houses simple.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register" className="px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:opacity-90">
                Create account &nbsp;
              </Link>
              <Link to="/login" className="px-5 py-3 rounded-xl border text-sm hover:bg-gray-100">
                 I have an access code
              </Link>
            </div>
            <div className="mt-6 text-sm text-gray-500">
              Trusted patterns used by top consumer apps: clean cards, clear actions, and instant feedback.
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border shadow-sm bg-white p-4">
              <div className="h-56 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-20 rounded-xl border bg-white" />
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-3xl bg-gray-200 blur-xl opacity-70" />
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-sm text-gray-500">
        © {new Date().getFullYear()} Fraternity Meals
      </footer>
    </div>
  );
}
