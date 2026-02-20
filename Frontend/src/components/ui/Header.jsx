import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { nav } from '../../data/site';
import Button from './Button';
import { BASE_URL } from '../../lib/api'; // Import BASE_URL

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-border-light/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 ml-4">
          <img src={`${BASE_URL}/uploads/lightmode_logo.png`} alt="Logo" className="h-10 w-10 rounded-full object-cover dark:hidden" />
          <img src={`${BASE_URL}/uploads/darkmode_logo.png`} alt="Logo" className="h-10 w-10 rounded-full object-cover hidden dark:block" />
          <div className="text-base sm:text-lg font-bold tracking-tight text-text-primary">Ordo</div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 ml-6 text-sm text-text-secondary">
          {nav.map((n) => (
            <NavLink key={n.label} to={n.to} className={({isActive}) => `hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ${isActive ? 'text-primary font-semibold' : ''}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
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
