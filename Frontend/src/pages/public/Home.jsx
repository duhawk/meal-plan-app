import Hero from "../../components/landing/Hero";
import FeatureGrid from "../../components/landing/FeatureGrid";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

const DEMO_EMAIL    = "demo@example.com";
const DEMO_PASSWORD = "password123";

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-gray-800 rounded-lg px-4 py-3">
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-white font-mono text-sm">{value}</p>
      </div>
      <button
        onClick={copy}
        className="text-gray-400 hover:text-white transition flex-shrink-0"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      <Hero />
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-dark-grey">Everything you need to run meals smoothly</h2>
          <p className="mt-3 text-dark-grey">Menus, late plates, reviews, and attendance built for chapters.</p>
          <div className="mt-6">
            <Link to="/features#reviews" className="btn bg-dark-grey text-light-grey hover:bg-transparent hover:text-dark-grey hover:border-dark-grey">Explore features</Link>
          </div>
        </div>
      </section>
      <div className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FeatureGrid />
        </div>
      </div>

      {/* Demo credentials */}
      <section className="py-24 px-6 bg-gray-900">
        <div className="max-w-md mx-auto text-center">
          <span className="inline-block mb-4 rounded-full border border-gray-600 px-3 py-1 text-xs text-gray-300">
            Try it out
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Explore with a demo account</h2>
          <p className="mt-3 text-gray-400">
            Use these credentials to log in and explore all features without signing up.
          </p>
          <div className="mt-8 space-y-3 text-left">
            <CopyField label="Email" value={DEMO_EMAIL} />
            <CopyField label="Password" value={DEMO_PASSWORD} />
          </div>
          <Link
            to="/login"
            state={{ email: DEMO_EMAIL, password: DEMO_PASSWORD }}
            className="btn mt-6 bg-white text-gray-900 hover:bg-gray-200 w-full justify-center"
          >
            Log in with demo account
          </Link>
        </div>
      </section>
    </div>
  );
}
