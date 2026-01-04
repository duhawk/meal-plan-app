// Meal_plan/Frontend/src/pages/Landing.jsx
import Header from "../components/ui/Header";
import Hero from "../components/landing/Hero";
import FeatureGrid from "../components/landing/FeatureGrid";
// Removed Pricing and Testimonials per request
import FAQ from "../components/landing/FAQ";
// Removed Contact per request
import Footer from "../components/ui/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <FeatureGrid />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
