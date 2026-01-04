import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import Button from './ui/Button';
import { useUser } from '../contexts/UserContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: { email, password },
      });
      if (data?.token) {
        localStorage.setItem('token', data.token);
        login(data.user);
        navigate('/app/menu');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary">Welcome back</h2>
          <p className="text-text-secondary mt-2">Sign in to continue to Fraternity Meals.</p>
        </div>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password"className="block text-sm font-medium text-text-secondary">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full">Sign In</Button>
        </form>
        <div className="text-sm text-center text-text-secondary">
          <Link to="/" className="font-medium text-primary hover:underline">
            Back to Home
          </Link>
          <span className="mx-2">|</span>
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
