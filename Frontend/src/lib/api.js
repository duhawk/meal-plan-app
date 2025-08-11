// Meal_plan/Frontend/src/lib/api.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5001";

export function withAuthHeaders(options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return { ...options, headers };
}

export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, withAuthHeaders(options));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

