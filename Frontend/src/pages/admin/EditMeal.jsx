import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '../../lib/api';
import Button from '../../components/ui/Button';

export default function EditMeal() {
  const { mealId } = useParams();
  const navigate = useNavigate();
  
  const [meal, setMeal] = useState(null);
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [mealDate, setMealDate] = useState('');
  const [mealType, setMealType] = useState('Dinner');
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchMeal = async () => {
      try {
        setLoading(true);
        const mealData = await api(`/api/meals/${mealId}`);
        setMeal(mealData);
        setDishName(mealData.dish_name);
        setDescription(mealData.description || '');
        setMealDate(new Date(mealData.meal_date).toISOString().slice(0, 16));
        setMealType(mealData.meal_type);
        setExistingImageUrl(mealData.image_url);
      } catch (err) {
        setError('Failed to load meal data.');
      } finally {
        setLoading(false);
      }
    };
    fetchMeal();
  }, [mealId]);

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
    setExistingImageUrl(null); // Clear existing image if new one is selected
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('meal_date', new Date(mealDate).toISOString());
    formData.append('meal_type', mealType);
    formData.append('dish_name', dishName);
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile);
    } else if (existingImageUrl) {
      formData.append('image_url', existingImageUrl);
    }

    try {
      await api(`/api/meals/${mealId}`, {
        method: 'PUT',
        body: formData,
      });
      setSuccess('Meal updated successfully!');
      setTimeout(() => navigate('/app/menu'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to update meal.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this meal? This action cannot be undone.")) {
      try {
        await api(`/api/meals/${mealId}`, { method: 'DELETE' });
        setSuccess('Meal deleted successfully.');
        setTimeout(() => navigate('/app/menu'), 1500);
      } catch (err) {
        setError(err.message || 'Failed to delete meal.');
      }
    }
  };

  if (loading) return <div className="text-center">Loading...</div>;
  if (error && !meal) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 shadow-lg p-8 dark:bg-slate-800/80 dark:border-slate-700">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1 dark:text-white">Edit Meal</h2>
          <p className="text-text-secondary mb-6 dark:text-gray-400">Update the details for this meal.</p>
        </div>
        <Button onClick={handleDelete} variant="danger">Delete Meal</Button>
      </div>

      {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
      {success && <div className="mb-4 text-green-600 text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="mealDate" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Date & Time</label>
            <input type="datetime-local" id="mealDate" value={mealDate} onChange={(e) => setMealDate(e.target.value)} required className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white" style={{ colorScheme: 'dark' }} />
          </div>
          <div>
            <label htmlFor="mealType" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Meal Type</label>
            <select id="mealType" value={mealType} onChange={(e) => setMealType(e.target.value)} className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white">
              <option>Lunch</option>
              <option>Dinner</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="dishName" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Dish Name</label>
          <input type="text" id="dishName" value={dishName} onChange={(e) => setDishName(e.target.value)} required className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white"></textarea>
        </div>
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-text-secondary dark:text-gray-400">Meal Image</label>
          {existingImageUrl && <img src={`${BASE_URL}${existingImageUrl}`} alt="Current" className="w-full h-32 object-cover rounded-md my-2" />}
          <input type="file" id="image" onChange={handleFileChange} accept="image/*" className="input mt-1 w-full bg-white/90 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        </div>
        <div className="pt-2 flex gap-3">
          <Button type="submit" className="w-full sm:w-auto">Save Changes</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/app/menu')} className="w-full sm:w-auto">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
