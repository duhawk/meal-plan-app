export const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5001";

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }

  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers.append("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

