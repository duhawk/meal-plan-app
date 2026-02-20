import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Button from '../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary">Forgot password?</h2>
          <p className="text-text-secondary mt-2">
            Enter your email.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 text-sm">
              A reset link is on its way. Check your inbox.
            </p>
            <Link to="/login" className="font-medium text-primary hover:underline text-sm">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900"
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full">Send reset link</Button>
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
