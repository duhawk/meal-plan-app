import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import Button from '../components/ui/Button';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await api('/api/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="w-full max-w-sm p-8 space-y-4 bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-text-primary">Invalid link</h2>
          <p className="text-red-500 text-sm">No reset token found. Please request a new reset link.</p>
          <Link to="/forgot-password" className="font-medium text-primary hover:underline text-sm">
            Forgot password?
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary">Reset password</h2>
          <p className="text-text-secondary mt-2">Enter your new password below.</p>
        </div>

        {success ? (
          <div className="text-center space-y-2">
            <p className="text-green-600 text-sm">Password reset! Redirecting to login…</p>
            <Link to="/login" className="font-medium text-primary hover:underline text-sm">
              Go to login
            </Link>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-text-secondary">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full">Reset password</Button>
            </form>
            <div className="text-sm text-center text-text-secondary">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
