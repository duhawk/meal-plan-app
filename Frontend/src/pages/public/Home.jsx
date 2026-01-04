import Hero from "../../components/landing/Hero";
import FeatureGrid from "../../components/landing/FeatureGrid";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-dark-grey">Everything you need to run meals smoothly</h2>
          <p className="mt-3 text-dark-grey">Menus, late plates, reviews, and attendance built for chapters.</p>
          <div className="mt-6">
            <Link to="/features" className="btn bg-dark-grey text-light-grey hover:bg-transparent hover:text-dark-grey hover:border-dark-grey">Explore features</Link>
          </div>
        </div>
      </section>
      <div className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FeatureGrid />
        </div>
      </div>
    </div>
  );
}
