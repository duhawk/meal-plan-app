import { useState, useEffect } from 'react'
import Register from './components/Register'
import Home from './components/Home'
import Login from './components/Login'
import MealReview from './components/MealReview'
import './App.css'


function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
      catch (e) {
        console.error('Failed to parse', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
        setToken(null);
      }
    }
  }, []); //The empty dependency array [] means this effect runs only once after the intial render

  const handleLoginSuccess = (user, jwtToken) => {
    setCurrentUser(user)
    setToken(jwtToken); // UI will auto switch to home since currentUser is defined
  };
  const handleRegisterSuccess = (msg) => {
    setMessage(msg);
    setShowLogin(true); // Switch to login view after successful registration
  }
  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLogin(true); // Switch back to login view after logout
  }


 return (
  <div className="App">
    <header>
      <h1>Meal Plan
      </h1>
      {currentUser && ( //conditional rendering if someone is logged in
        <div style={{ marginTop : '10px'}}>
          <span>Welcome, {currentUser.name || currentUser.email}!</span>
          <MealReview/>
          <button onClick={handleLogout} style={{ marginLeft: '10px' }}>
            Logout
          </button>

        </div>
      )}
    </header>
    <main>
      {currentUser ? (
        <Home currentUser={currentUser} token={token}
        />
      ) : ( // React fragment that groups login and register
        <>  
        {message && <p>{message}</p>}
        {showLogin ? ( //conditonal statment that render login component if true, else renders the register component
          <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => {setShowLogin(false); setMessage('')}}/>
        ) : (
          <Register onRegisterSuccess={handleRegisterSuccess} onSwitchToLogin={() => {setShowLogin(true); setMessage('')}} />
        )}
        </>
      )}
      </main>
  </div>
 )
}
export default App;
