import { useNavigate, Link } from "react-router-dom";
import React, { useState } from 'react';
import { api } from "../lib/api";
import Button from './ui/Button';

function Register({ onRegisterSuccess, onSwitchToLogin }){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [accessCode, setAccessCode] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const data = await api('/api/register', {
                method: 'POST',
                body: { email, password, firstName, lastName, access_code: accessCode || undefined },
            });

            if (data?.message) {
                setMessage('Check your email to verify your account before logging in.');
            }
        }
        catch (err) {
            console.error('Error during registration:', err);
            setError(err.message || 'Could not connect to the server. Please try again later.');
        }
    }

    return (
      <div className="min-h-screen grid place-items-center px-4 py-8">
        <div className="w-full max-w-md p-8 space-y-6 bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-text-primary">Create your account</h2>
            <p className="text-text-secondary mt-2">Join Ordo to start planning.</p>
          </div>

          {message && <p className="text-green-600 text-sm text-center">{message}</p>}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full">
                <label htmlFor="firstName" className="block text-sm font-medium text-text-secondary">First Name</label>
                <input id="firstName" type="text" value={firstName} onChange={(e)=>setFirstName(e.target.value)} required className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900" autoComplete="given-name" />
              </div>
              <div className="w-full">
                <label htmlFor="lastName" className="block text-sm font-medium text-text-secondary">Last Name</label>
                <input id="lastName" type="text" value={lastName} onChange={(e)=>setLastName(e.target.value)} required className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900" autoComplete="family-name" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email</label>
              <input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">Password</label>
              <input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900" autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-text-secondary">Access Code</label>
              <input id="accessCode" type="text" value={accessCode} onChange={(e)=>setAccessCode(e.target.value)} className="input mt-1 w-full bg-white/50 border-border-light rounded-lg text-text-primary dark:bg-white dark:text-gray-900" autoComplete="off" placeholder="Ask your house president" />
            </div>
            <Button type="submit" className="w-full">Create Account</Button>
            <div className="text-sm text-center text-text-secondary">
              <Link to="/" className="font-medium text-primary hover:underline">
                Back to Home
              </Link>
              <span className="mx-2">|</span>
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
}
    
export default Register;
