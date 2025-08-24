// Meal_plan/Frontend/src/routes.jsx
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import MobileShell from "./components/MobileShell";

// Public
import Landing from "./pages/Landing";
import Login from "./components/Login";
import Register from "./components/Register";

// App pages 
import Home from "./components/Home";
import WeeklyMenu from "./components/WeeklyMenu";
import MealReview from "./components/MealReview";

// Admin placeholders 
import Admin from "./pages/admin/Admin";
import AdminMeals from "./pages/admin/AdminMeals";
import AdminReviews from "./pages/admin/AdminReviews.jsx";

function isAuthed() { return Boolean(localStorage.getItem("token")); }

function Protected({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return children;
}

const router = createBrowserRouter([
  // Public site
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },

  // App sign in
  {
    path: "/app",
    element: (
      <Protected>
        <MobileShell />
      </Protected>
    ),
    children: [
      { path: "home", element: <Home /> },
      { path: "menu", element: <WeeklyMenu /> },
      { path: "reviews", element: <MealReview /> },
    ],
  },

  // Admin area 
  {
    path: "/admin",
    element: (
      <Protected>
        <Admin />
      </Protected>
    ),
    children: [
      { path: "meals", element: <AdminMeals /> },
      { path: "reviews", element: <AdminReviews /> },
    ],
  },

  { path: "*", element: <Navigate to="/" /> },
]);

export default function AppRouter() { return <RouterProvider router={router} />; }

