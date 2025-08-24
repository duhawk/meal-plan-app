import React, { useState, useEffect } from 'react';
import { api } from "../lib/api";

export default function WeeklyMenu() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const data = await api("/api/menu");
        setMeals(Array.isArray(data?.meals) ? data.meals : []);
      } catch (e) {
        setErr(e.message || "Failed to load menu.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center py-10 text-gray-500">Loading menu…</div>;
  if (err) return <div className="text-center py-10 text-red-600">{err}</div>;
  if (!meals.length) return <div className="text-center py-10 text-gray-500">No meals scheduled.</div>;

  return (
    <div className="space-y-4">
      {meals.map((m) => (
        <div key={m.id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500">{new Date(m.meal_date).toLocaleString()}</div>
              <div className="text-lg font-semibold">{m.dish_name || m.meal_type}</div>
              {m.description && <div className="text-gray-600 mt-1 text-sm">{m.description}</div>}
            </div>
            {m.image_url && (
              <img src={m.image_url} alt="" className="w-20 h-20 object-cover rounded-xl border" />
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="rounded-xl border py-2 hover:bg-gray-50">Review</button>
            <button className="rounded-xl border py-2 hover:bg-gray-50">Late Plate</button>
            <button className="rounded-xl border py-2 hover:bg-gray-50">I’m Attending</button>
          </div>
        </div>
      ))}
    </div>
  );
}



    