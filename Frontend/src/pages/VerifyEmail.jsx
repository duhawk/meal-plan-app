import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(''); // '' | 'sent' | 'error'
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    api(`/api/verify-email?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed.');
      });
  }, [searchParams]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendStatus('');
    try {
      await api('/api/resend-verification', {
        method: 'POST',
        body: { email: resendEmail },
      });
      setResendStatus('sent');
    } catch (err) {
      setResendStatus(err.message || 'Failed to resend. Please try again.');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg text-center">
        {status === 'loading' && (
          <>
            <h2 className="text-2xl font-bold text-text-primary">Verifying your email…</h2>
            <p className="text-text-secondary">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 className="text-2xl font-bold text-text-primary">Email verified!</h2>
            <p className="text-text-secondary">{message}</p>
            <Link to="/login" className="inline-block mt-4 font-medium text-primary hover:underline">
              Go to login →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-2xl font-bold text-text-primary">Link expired</h2>
            <p className="text-red-500 text-sm">{message}</p>

            <div className="pt-2">
              <p className="text-text-secondary text-sm mb-3">Enter your email to get a new verification link:</p>
              {resendStatus === 'sent' ? (
                <p className="text-green-600 text-sm">Verification email sent! Check your inbox.</p>
              ) : (
                <form onSubmit={handleResend} className="space-y-3">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="input w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900"
                  />
                  {typeof resendStatus === 'string' && resendStatus && resendStatus !== 'sent' && (
                    <p className="text-red-500 text-sm">{resendStatus}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition"
                  >
                    Resend verification email
                  </button>
                </form>
              )}
            </div>

            <Link to="/login" className="inline-block text-sm text-text-secondary hover:underline">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
