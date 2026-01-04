import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gray-900">
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
        <div
          className="relative left-1/2 -z-10 aspect-[1108/632] w-[72rem] -translate-x-1/2 bg-gradient-to-tr from-matte-blue-start to-matte-blue-end opacity-30"
          style={{ clipPath: 'polygon(74% 44%, 100% 66%, 92% 100%, 46% 87%, 0 100%, 11% 55%, 22% 0, 43% 19%)' }}
        />
      </div>
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-24 grid lg:grid-cols-12 gap-10 items-center">
        <motion.div className="lg:col-span-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-400 px-3 py-1 text-xs text-white">
            Built for chapters and scaled for nationals
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Plan meals, collect feedback, run smoother.
          </h1>
          <p className="mt-4 text-gray-300 text-lg">
            Weekly menus, late plates, attendance, and reviews—all in one fast, mobile‑first experience. Access codes let you onboard chapters in minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn bg-white text-gray-900 hover:bg-gray-200">Create account</Link>
            <Link to="/login" className="btn bg-transparent border-gray-400 text-white hover:bg-gray-800">I have an access code</Link>
          </div>
          <div className="mt-6 text-sm text-gray-300">
            No setup fees. Start free, invite your house today.
          </div>
          <div className="mt-6 flex items-center gap-6 text-gray-300 text-sm" aria-label="Trusted by">
            <span>Trusted by chapters at</span>
            <div className="h-5 w-24 rounded bg-gray-700" aria-hidden />
            <div className="h-5 w-20 rounded bg-gray-700" aria-hidden />
            <div className="h-5 w-28 rounded bg-gray-700" aria-hidden />
          </div>
        </motion.div>

        <motion.div className="lg:col-span-6 relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <div className="rounded-3xl border border-gray-700 shadow-sm bg-gray-800 p-4">
            <div className="h-56 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-600" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <motion.div key={i} className="h-20 rounded-xl border border-gray-700 bg-gray-800" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }} />
              ))}
            </div>
          </div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-3xl bg-matte-blue-end blur-2xl opacity-30" />
        </motion.div>
      </div>
    </section>
  );
}
