import { features } from '../../data/site';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 mt-16">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, idx) => {
          const Icon = Icons[f.icon] ?? Icons.CircleCheck;
          return (
            <motion.div key={f.title} className="card bg-white border border-dark-grey" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: idx * 0.05 }}>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-matte-blue-start to-matte-blue-end text-white">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <div className="text-lg font-semibold text-dark-grey">{f.title}</div>
                  <p className="mt-1 text-dark-grey text-sm">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
