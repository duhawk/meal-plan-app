import React, { useState, useEffect } from 'react';
import MealReview from './MealReview';

function WeeklyMenu({ token }) {
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMeal, setSelectedMeal] = useState(null);
    

    useEffect(() => {
        const fetchMenu = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await fetch('http://127.0.0.1:5001/api/menu', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`, // Include the token in the request headers
                    },
                });

                const data = await response.json();

                if (response.ok) {
                    const sortedMeals = data.meals.sort((a, b) => {
                        const dateA = new Date(a.meal_date)
                        const dateB = new Date(b.meal_date);
                        if (dateA - dateB !== 0) {
                            return dateA - dateB; // Sort by meal_date
                        }
                        else {
                            const mealTypeOrder = {'Lunch': 1, 'Dinner': 2};
                            return mealTypeOrder[a.meal_type] - mealTypeOrder[b.meal_type]; // Sort by meal_type
                        }
                        
                    });
                    setMeals(sortedMeals);
                }
                else {
                    setError(data.error || 'Failed to fetch menu. Please try again.');
                }
            }
            catch (e) {
                console.error('Error fetching menu:', e);
                setError('Could not connect to the server. Please try again later.');
            }
            finally {
                setLoading(false);
            }
        };

        if (token) { //if user is logged in fetch the menu
            fetchMenu();
        }
    }, [token]); // Re-run the effect if the token changes

    if (loading) return <p>Loading menu...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (meals.length === 0) return <p>No meals available for this week.</p>;

    const mealsByDate = meals.reduce((acc, meal) => {
    const dateKey = new Date(meal.meal_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(meal);
    return acc;
}, {});

const handleReviewSubmit = async (reviewData) => {
    try {
        const response = await fetch(`http://localhost:5001/api/meals/${selectedMeal?.id}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token || localStorage.getItem('token')}`,
            },
            body: JSON.stringify(reviewData),
        });

        if (!response.ok) {
            throw new Error('Failed to submit review');
        }

        alert('Review submitted successfully!');
        setSelectedMeal(null);
        // Optionally refresh menu or reviews here
    } catch (err) {
        console.error('Error submitting review:', err);
        alert('Failed to submit review. Please try again.');
    }
};

return (
    <div className="weekly-menu">
        <h2>Weekly Menu</h2>
        {Object.entries(mealsByDate).map(([date, dayMeals]) => (
            <div key={date} className='daily-menu-section card' style={{ marginBottom: '20px' }}>
                <h3>{date}</h3>
                {dayMeals.map((meal) => (
                    <div
                        key={meal.id}
                        className="meal-item"
                        style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '12px',
                            backgroundColor: '#fff',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0' }}>{meal.dish_name}</h4>
                                <p style={{ margin: '0 0 8px 0', color: '#666' }}>{meal.meal_type}</p>
                            </div>
                            {meal.image_url && (
                                <img
                                    src={meal.image_url}
                                    alt={meal.dish_name}
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                    }}
                                />
                            )}
                        </div>

                        <p style={{ margin: '8px 0' }}>{meal.description}</p>

                        {selectedMeal?.id === meal.id ? (
                            <MealReview
                                MealId={meal.id}
                                onReviewSubmit={handleReviewSubmit}
                                onCancel={() => setSelectedMeal(null)}
                            />
                        ) : (
                            <button
                                onClick={() => setSelectedMeal(meal)}
                                style={{
                                    marginTop: '10px',
                                    padding: '8px 16px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Leave a Review
                            </button>
                        )}
                    </div>
                ))}
            </div>
        ))}
    </div>
);


};
export default WeeklyMenu;


    