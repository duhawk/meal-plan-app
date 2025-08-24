import { useNavigate, Link } from "react-router-dom";
import React, { useState } from 'react';

function Register({ onRegisterSuccess, onSwitchToLogin}){ /*Declare the state variables for this */
    const [email, setEmail] = useState('');  /*Hold state values which can contain the values users put*/
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Hook to programmatically navigate
    const [accessCode, setAccessCode] = useState(''); // State variable to hold access code input
    const handleSubmit = async (e) => { /*Will execute when form is submitted. Waits for event to happen*/
        e.preventDefault(); // Prevent page reload 
        setMessage('');
        setError('');
        try {
            const data = await api('/api/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, firstName, lastName, access_code: accessCode || undefined }),
            });

            if (data?.message) { // Check if the HTTP status is 201
                setMessage(data.message);
                setEmail('');
                setPassword('');
                setFirstName('');
                setLastName('');

                navigate('/login'); // Redirect to login page after successful registration
            }
        }
        catch (err) {
            console.error('Error during registration:', err);
            setError('Could not connect to the server. Please try again later.');
    }
    }
    // /*Links label to input field
    return (
        <div className="card">
            <h2>Register</h2>
            {message && <p style={{ color: 'green'}}>{message}</p>}
            {error && <p style={{ color: 'red'}}>{error}</p>}
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
                <div>
                    <label htmlFor="firstName">First Name:</label>
                    <input
                        type="text"
                        style={{ backgroundColor: 'white', color: 'black'}}
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        />
                </div>
                <div>
                    <label htmlFor="lastName">Last Name:</label>
                    <input
                        type="text"
                        style={{ backgroundColor: 'white', color: 'black'}}
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        />
                </div>
                <button type="submit">Register</button>
            </form>
            <p>
                Already have an account?{' '}
                <Link to="/login" className="px-5 py-3 rounded-xl border text-sm hover:bg-gray-100">
                    Login here {/*This button will switch to the login form*/}  
                </Link>
            </p>
        </div>
        );
    
    }
    
    export default Register;

    


