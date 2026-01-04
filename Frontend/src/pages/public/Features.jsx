import FeatureGrid from "../../components/landing/FeatureGrid";

export default function FeaturesPage() {
  return (
    <div className="py-24 px-6 bg-light-grey">
      <div className="max-w-6xl mx-auto">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-dark-grey">Features</h1>
          <p className="mt-3 text-dark-grey text-lg">Built to simplify chapter meal planning.</p>
        </header>
        <div className="mt-10">
          <FeatureGrid />
        </div>
      </div>
    </div>
  );
}
