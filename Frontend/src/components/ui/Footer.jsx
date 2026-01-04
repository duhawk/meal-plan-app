import { footer } from '../../data/site';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-800 bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-r from-matte-blue-start to-matte-blue-end" />
              <div className="text-base font-extrabold text-white">Fraternity Meals</div>
            </div>
            <p className="mt-3 text-sm text-gray-300">Meal planning built for chapters. Scales to nationals.</p>
          </div>
          {footer.sitemap.map((s) => (
            <div key={s.label}>
              <div className="text-sm font-semibold text-white">{s.label}</div>
              <div className="mt-2 flex gap-4 text-sm text-gray-300">
                {s.links.map(([label, href]) => (
                  <a key={label} href={href} className="hover:text-matte-blue-end">{label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between text-sm text-gray-300">
          <div>© {new Date().getFullYear()} Fraternity Meals</div>
          <div className="flex gap-4">
            {footer.socials.map((s) => (
              <a key={s.label} href={s.href} className="hover:text-matte-blue-end">{s.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
