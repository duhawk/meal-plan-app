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
import Profile from "./pages/app/Profile";

// Admin pages
import AdminLatePlates from "./pages/admin/AdminLatePlates";
import Admin from "./pages/admin/Admin";
import AdminMeals from "./pages/admin/AdminMeals";
import AdminReviews from "./pages/admin/AdminReviews.jsx";
import AdminAttendance from "./pages/admin/AdminAttendance.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import EditMeal from "./pages/admin/EditMeal.jsx";
import MealAttendanceDetails from "./pages/admin/MealAttendanceDetails.jsx";
import AdminRecommendations from "./pages/admin/AdminRecommendations";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";

import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import { useUser } from "./contexts/UserContext";

function isAuthed() { return Boolean(localStorage.getItem("token")); }

function Protected({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return children;
}

function OwnerProtected({ children }) {
  const { user, loading } = useUser();
  if (loading) return null;
  if (!user?.is_owner) return <Navigate to="/app/home" replace />;
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
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/verify-email", element: <VerifyEmail /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },

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
      {
        path: "reviews",
        element: (
          <OwnerProtected>
            <Reviews />
          </OwnerProtected>
        ),
      },
      { path: "past-meals", element: <PastMeals /> },
      { path: "recommend", element: <MealRecommendationForm /> },
      { path: "profile", element: <Profile /> },
      {
        path: "admin",
        element: <Admin />,
        children: [
          { index: true, element: <Navigate to="meals" /> },
          { path: "meals", element: <AdminMeals /> },
          {
            path: "reviews",
            element: (
              <OwnerProtected>
                <AdminReviews />
              </OwnerProtected>
            ),
          },
          { path: "attendance", element: <AdminAttendance /> },
          { path: "users", element: <AdminUsers /> },
          { path: "late-plates", element: <AdminLatePlates /> },
          { path: "recommendations", element: <AdminRecommendations /> },
          { path: "analytics", element: <AdminAnalytics /> },
          {
            path: "settings",
            element: (
              <OwnerProtected>
                <AdminSettings />
              </OwnerProtected>
            ),
          },
          { path: "edit-meal/:mealId", element: <EditMeal /> },
          { path: "attendance/:mealId", element: <MealAttendanceDetails /> },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" /> },
]);

export default function AppRouter() { return <RouterProvider router={router} />; }
