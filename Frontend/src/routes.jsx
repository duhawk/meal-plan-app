// Meal_plan/Frontend/src/routes.jsx
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import MobileShell from "./components/MobileShell";

// Public layout + pages
import PublicLayout from "./layouts/PublicLayout";
import HomePage from "./pages/public/Home";
import FeaturesPage from "./pages/public/Features";
import Login from "./components/Login";
import Register from "./components/Register";

// App pages 
import Home from "./components/Home";
import WeeklyMenu from "./components/WeeklyMenu";
import Reviews from "./components/Reviews";
import PastMeals from "./pages/app/PastMeals";
import MealRecommendationForm from "./pages/app/MealRecommendationForm";

// Admin placeholders 
import Admin from "./pages/admin/Admin";
import AdminMeals from "./pages/admin/AdminMeals";
import AdminReviews from "./pages/admin/AdminReviews.jsx";
import AdminAttendance from "./pages/admin/AdminAttendance.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";

function isAuthed() { return Boolean(localStorage.getItem("token")); }


function Protected({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return children;
}

const router = createBrowserRouter([
  // Public site
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "features", element: <FeaturesPage /> },
      // Removed Pricing and Contact routes per request
    ],
  },
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
      { path: "reviews", element: <Reviews /> },
      { path: "past-meals", element: <PastMeals /> },
      { path: "recommend", element: <MealRecommendationForm /> },
      {
        path: "admin",
        element: <Admin />,
        children: [
          { index: true, element: <Navigate to="meals" /> },
          { path: "meals", element: <AdminMeals /> },
          { path: "reviews", element: <AdminReviews /> },
          { path: "attendance", element: <AdminAttendance /> },
          { path: "users", element: <AdminUsers /> },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" /> },
]);

export default function AppRouter() { return <RouterProvider router={router} />; }
