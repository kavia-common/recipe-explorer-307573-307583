const API_BASE = 'http://localhost:3001';

/**
 * PUBLIC_INTERFACE
 * Minimal API wrapper for the Recipe Explorer backend.
 */
export async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let detail = 'Request failed';
    try {
      const data = await res.json();
      detail = data.detail || data.message || JSON.stringify(data);
    } catch (e) {
      // ignore
    }
    throw new Error(detail);
  }

  // Some endpoints may return empty body; keep safe.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * PUBLIC_INTERFACE
 * Gets/creates a stable user id stored in localStorage.
 */
export function getUserId() {
  const key = 'recipeExplorerUserId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `u_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// PUBLIC_INTERFACE
export function listCategories() {
  return apiRequest('/categories');
}

// PUBLIC_INTERFACE
export function listRecipes({ categoryId, q, ingredients }) {
  const params = new URLSearchParams();
  if (categoryId) params.set('category_id', categoryId);
  if (q) params.set('q', q);
  if (ingredients) params.set('ingredients', ingredients);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/recipes${qs}`);
}

// PUBLIC_INTERFACE
export function getRecipe(recipeId) {
  return apiRequest(`/recipes/${recipeId}`);
}

// PUBLIC_INTERFACE
export function listFavorites(userId) {
  const params = new URLSearchParams({ user_id: userId });
  return apiRequest(`/favorites?${params.toString()}`);
}

// PUBLIC_INTERFACE
export function addFavorite(recipeId, userId) {
  return apiRequest(`/favorites/${recipeId}`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

// PUBLIC_INTERFACE
export function removeFavorite(recipeId, userId) {
  const params = new URLSearchParams({ user_id: userId });
  return apiRequest(`/favorites/${recipeId}?${params.toString()}`, { method: 'DELETE' });
}

// PUBLIC_INTERFACE
export function upsertRating(recipeId, userId, rating) {
  return apiRequest(`/recipes/${recipeId}/ratings`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, rating }),
  });
}

// PUBLIC_INTERFACE
export function getMyRating(recipeId, userId) {
  const params = new URLSearchParams({ user_id: userId });
  return apiRequest(`/recipes/${recipeId}/ratings/me?${params.toString()}`);
}
