import { useState, useEffect, useCallback } from 'react';
import { api, BASE_URL } from '../../lib/api';
import Button from '../../components/ui/Button';

// A stable debounce implementation using setTimeout
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

const MealSlotForm = ({ meal, onUpdate, onFileChange, onAutofill }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const { meals } = await api(`/api/meals/search?q=${query}`);
        setSearchResults(meals);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleSelectMeal = (selectedMeal) => {
    onAutofill(meal.id, selectedMeal);
    setSearchQuery('');
    setSearchResults([]);
  };

  const imageUrl = meal.image_url ? `${BASE_URL}${meal.image_url}` : null;

  return (
    <div className="p-4 bg-white/50 dark:bg-slate-700/50 rounded-lg border border-border-light dark:border-slate-700 relative">
      <h3 className="font-semibold text-text-primary dark:text-white">
        {new Date(meal.meal_date).toLocaleDateString(undefined, { weekday: 'long' })} - {meal.meal_type}
      </h3>
      <div className="mt-2 space-y-3">
        <div className="relative">
          <label className="text-xs text-text-secondary dark:text-gray-400">Dish Name (type to search)</label>
          <input 
            type="text" 
            value={meal.dish_name}
            onChange={(e) => {
              onUpdate(meal.id, 'dish_name', e.target.value);
              setSearchQuery(e.target.value);
            }}
            className="input w-full text-sm bg-white/80 border-gray-300 rounded-md dark:bg-slate-600 dark:border-slate-500 dark:text-white"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-border-light dark:border-slate-600">
              <ul>
                {searchResults.map((result, index) => (
                  <li 
                    key={index} 
                    onClick={() => handleSelectMeal(result)}
                    className="px-3 py-2 text-sm text-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {result.dish_name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-text-secondary dark:text-gray-400">Description</label>
          <textarea 
            value={meal.description}
            onChange={(e) => onUpdate(meal.id, 'description', e.target.value)}
            rows="2"
            className="input w-full text-sm bg-white/80 border-gray-300 rounded-md dark:bg-slate-600 dark:border-slate-500 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary dark:text-gray-400">Image</label>
          {imageUrl && <img src={imageUrl} alt="Current" className="w-full h-24 object-cover rounded-md my-2" />}
          <input 
            type="file"
            onChange={(e) => onFileChange(meal.id, e.target.files[0])}
            accept="image/*"
            className="input w-full text-xs bg-white/80 border-gray-300 rounded-md dark:bg-slate-600 dark:border-slate-500 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default function AdminMeals() {
  const [mealSlots, setMealSlots] = useState([]);
  const [imageFiles, setImageFiles] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGenerateWeek = () => {
    const startDateStr = prompt("Enter the start date for the week (e.g., YYYY-MM-DD, will be treated as Sunday):", new Date().toISOString().slice(0, 10));
    if (!startDateStr) return;

    const inputDate = new Date(startDateStr + 'T00:00:00');
    const dayOfWeek = inputDate.getDay();
    
    const sundayDate = new Date(inputDate);
    sundayDate.setDate(inputDate.getDate() - dayOfWeek);

    const newSlots = [];
    
    const sunday = new Date(sundayDate);
    sunday.setHours(17, 0, 0, 0);
    newSlots.push({ id: 'dinner-sun', meal_date: sunday.toISOString(), meal_type: 'Dinner', dish_name: '', description: '', image_url: null });

    for (let i = 1; i <= 4; i++) {
      const day = new Date(sundayDate);
      day.setDate(sundayDate.getDate() + i);
      
      const lunchDate = new Date(day);
      lunchDate.setHours(12, 0, 0, 0);
      newSlots.push({ id: `lunch-${i}`, meal_date: lunchDate.toISOString(), meal_type: 'Lunch', dish_name: '', description: '', image_url: null });

      const dinnerDate = new Date(day);
      dinnerDate.setHours(17, 0, 0, 0);
      newSlots.push({ id: `dinner-${i}`, meal_date: dinnerDate.toISOString(), meal_type: 'Dinner', dish_name: '', description: '', image_url: null });
    }

    const friday = new Date(sundayDate);
    friday.setDate(sundayDate.getDate() + 5);
    friday.setHours(12, 0, 0, 0);
    newSlots.push({ id: 'lunch-fri', meal_date: friday.toISOString(), meal_type: 'Lunch', dish_name: '', description: '', image_url: null });

    setMealSlots(newSlots);
    setImageFiles({});
    setSuccess('');
    setError('');
  };

  const handleUpdateSlot = (id, field, value) => {
    setMealSlots(currentSlots => 
      currentSlots.map(slot => slot.id === id ? { ...slot, [field]: value } : slot)
    );
  };

  const handleAutofillSlot = (id, data) => {
    setMealSlots(currentSlots =>
      currentSlots.map(slot => slot.id === id ? { ...slot, dish_name: data.dish_name, description: data.description, image_url: data.image_url } : slot)
    );
  };

  const handleFileChange = (id, file) => {
    setImageFiles(currentFiles => ({
      ...currentFiles,
      [id]: file,
    }));
    // When a new file is selected, clear the existing image_url for that slot
    setMealSlots(currentSlots =>
      currentSlots.map(slot => slot.id === id ? { ...slot, image_url: null } : slot)
    );
  };

  const handleSaveAll = async () => {
    setError('');
    setSuccess('');
    
    const mealsToSave = mealSlots.filter(slot => slot.dish_name.trim() !== '');
    if (mealsToSave.length === 0) {
      setError("Please fill in at least one dish name.");
      return;
    }

    const formData = new FormData();
    formData.append('meals', JSON.stringify(mealsToSave));
    
    mealsToSave.forEach(meal => {
      if (imageFiles[meal.id]) {
        formData.append(`image-${meal.id}`, imageFiles[meal.id]);
      }
    });

    setSubmitting(true);
    try {
      await api('/api/meals/bulk', {
        method: 'POST',
        body: formData,
      });
      setSuccess(`${mealsToSave.length} meals saved successfully!`);
      setMealSlots([]);
      setImageFiles({});
    } catch (err) {
      setError(err.message || 'Failed to save meals.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-8 dark:bg-slate-800/80 dark:border-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1 dark:text-white">Weekly Meal Creation</h2>
          <p className="text-text-secondary mb-6 dark:text-gray-400">Generate slots for the week and fill in the details.</p>
        </div>
        <Button onClick={handleGenerateWeek}>Generate Weekly Menu</Button>
      </div>

      {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
      {success && <div className="mb-4 text-green-600 text-sm">{success}</div>}

      {mealSlots.length > 0 && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mealSlots.map(slot => (
              <MealSlotForm key={slot.id} meal={slot} onUpdate={handleUpdateSlot} onFileChange={handleFileChange} onAutofill={handleAutofillSlot} />
            ))}
          </div>
          <div className="pt-2 flex justify-end">
            <Button onClick={handleSaveAll} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Saving...' : `Save All ${mealSlots.filter(s => s.dish_name).length} Meals`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

