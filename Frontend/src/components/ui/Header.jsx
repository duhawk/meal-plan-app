import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { nav } from '../../data/site';
import ThemeToggle from './ThemeToggle';
import Button from './Button';

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-border-light/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-3">
        <ThemeToggle />
        <Link to="/" className="flex items-center gap-2 ml-4">
          <div className="h-7 w-7 rounded-lg bg-primary" />
          <div className="text-base sm:text-lg font-bold tracking-tight text-text-primary">Fraternity Meals</div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 ml-6 text-sm text-text-secondary">
          {nav.map((n) => (
            <NavLink key={n.label} to={n.to} className={({isActive}) => `hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ${isActive ? 'text-primary font-semibold' : ''}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
            <input aria-label="Search"
                   placeholder="Search…"
                   className="input pl-9 w-52 bg-white/50 border-border-light rounded-lg text-text-primary" />
          </div>
          <Link to="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
