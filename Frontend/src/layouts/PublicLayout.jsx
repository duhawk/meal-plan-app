import Header from "../components/ui/Header";
import Footer from "../components/ui/Footer";
import { Outlet } from "react-router-dom";
import { useEffect } from "react"; // Import useEffect

export default function PublicLayout() {
  useEffect(() => {
    // Ensure public pages are always in light mode
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-light-grey">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

