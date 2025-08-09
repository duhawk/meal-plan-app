import React from 'react';
import WeeklyMenu from './WeeklyMenu';

function Home({ currentUser, token}) {
    return (
        <div className="home-container">
            <h2>Welcome, {currentUser.name || currentUser.email}!</h2>
            <p>Explore the menu for the week.</p>

            <WeeklyMenu token={token} />
            </div>
    );
}
export default Home;