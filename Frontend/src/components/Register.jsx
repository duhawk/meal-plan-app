import React, { useState } from 'react';

function Register({ onRegisterSuccess, onSwitchToLogin}){ /*Declare the state variables for this */
    const [email, setEmail] = useState('');  /*Hold state values which can contain the values users put*/
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => { /*Will execute when form is submitted. Waits for event to happen*/
        e.preventDefault(); // Prevent page reload 
        setMessage('');
        setError('');
        try {
            const response = await fetch('http://127.0.0.1:5001/api/register',{ /*Await pauses the execution of handleSubmit until fetch request returns url*/
                method: 'POST',
                headers: {
                    'Content-Type' : 'application/json',
                },
                body: JSON.stringify({ //sending the data as JSON
                    email,
                    password,
                    firstName,
                    lastName
                }),
            });
            const data = await response.json(); // parse the JSON response from backend

            if (response.ok){ // Check if the HTTP status is 201
                setMessage(data.message); //
                setEmail('');
                setPassword('');
                setFirstName('');
                setLastName('');

                
                if (onRegisterSuccess){
                    onRegisterSuccess(data.message);
                    onSwitchToLogin();
                }
             } else {
                    setError(data.error || 'Registration failed. Please try again.');
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
                <span className="link-text" onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: '#646cff', cursor: 'pointer', padding: 0}}>
                    Login here {/*This button will switch to the login form*/}  
                </span>
            </p>
        </div>
        );
    
    }
    
    export default Register;

    


