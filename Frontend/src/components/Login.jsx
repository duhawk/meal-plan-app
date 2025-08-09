import React, { useState } from 'react'

function Login({ onLoginSuccess, onSwitchToRegister}) {
    const [email, setEmail]= useState(''); // State variable to hold email input
    const [password, setPassword] = useState(''); // State variable to hold password input
    const [error, setError] = useState(''); // State variable to hold error messages
    const [message, setMessage] = useState(''); // State variable to hold success messages

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const response = await fetch('http://127.0.0.1:5001/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setEmail('');
                setPassword('');

                // store the token and user data received from backend
                localStorage.setItem('token', data.token); // Store token in local storage
                localStorage.setItem('user', JSON.stringify(data.user)); // Store user data in local storage
                
                if (onLoginSuccess) {
                    onLoginSuccess(data.user, data.token); // Pass user data to the parent component
                }
            } else {
                setError(data.error || 'Login failed. Please try again.');
            }
        } catch (err) {
            console.error('Error during login:', err);
            setError('Could not connect to the server. Please try again later.');
        }
    }

return (
    <div className="card">
        <h2>Login</h2>
        {message && <p style={{ color: 'green' }}>{message}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
            <div>
                <label htmlFor="email">Email:</label>
                <input 
                    type="email"
                    style={{ backgroundColor: 'white', color: 'black'}}
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div>
                <label htmlFor="password">Password:</label>
                <input
                    type="password"
                    style={{ backgroundColor: 'white', color: 'black'}}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            <button type="submit">Login</button>
        </form>
        <p>
            Don't have an account?{' '}
            <span className = 'link-text' 
                onClick={onSwitchToRegister}>
                Register here
            </span>        
        </p>
    </div>
);
}
export default Login;