import { useNavigate, Link } from "react-router-dom";
import React, { useState } from 'react'
import { api } from "../lib/api"


function Login({ onLoginSuccess, onSwitchToRegister}) {
    const [email, setEmail]= useState(''); // State variable to hold email input
    const [password, setPassword] = useState(''); // State variable to hold password input
    const [error, setError] = useState(''); // State variable to hold error messages
    const [message, setMessage] = useState(''); // State variable to hold success messages
    const navigate = useNavigate();
    const [accessCode, setAccessCode] = useState(''); // State variable to hold access code input
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
// ...
            const data = await api('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, access_code: accessCode || undefined }),
                });
            // Check if the response contains a token and user data
            if (data?.token) {
                localStorage.setItem("token", data.token);
                onLoginSuccess?.({ token: data.token, user: data.user });
                navigate("/app/home");
            }

             else {
                setError(data.error || 'Login failed. Please try again.');
            }}
        catch (err) {
            console.error('Error during login:', err);
            setError('Could not connect to the server. Please try again later.');
        }
    }

return (
  <div className="max-w-sm mx-auto py-10">
    <h2 className="text-2xl font-bold">Welcome back</h2>
    <p className="text-gray-600 mt-1">Sign in with your email and access code.</p>

    {message && <p className="mt-3 text-green-600">{message}</p>}
    {error && <p className="mt-3 text-red-600">{error}</p>}

    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
               type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium">Password</label>
        <input className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
               type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium">Access Code (optional for now)</label>
        <input className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
               placeholder="e.g. BETA-OMEGA-2025" value={accessCode} onChange={(e)=>setAccessCode(e.target.value)} />
        <p className="text-xs text-gray-500 mt-1">Used to associate you with a fraternity chapter.</p>
      </div>

      <button className="w-full rounded-xl bg-gray-900 text-white py-2.5 font-semibold hover:opacity-90">
        Sign in
      </button>

      <div className="text-sm text-gray-600 text-center">
        Don’t have an account? <Link to="/register" className="text-gray-900 font-medium">Create one</Link>
      </div>
    </form>
  </div>
);
}
export default Login;