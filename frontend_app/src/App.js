import React, { useEffect, useMemo, useState } from 'react';
import './index.css';
import {
  addFavorite,
  getMyRating,
  getRecipe,
  getUserId,
  listCategories,
  listFavorites,
  listRecipes,
  removeFavorite,
  upsertRating,
} from './api';

function Stars({ value }) {
  const rounded = Math.round(value || 0);
  return (
    <span aria-label={`Rating ${value?.toFixed?.(1) || 0} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="star">
          {i < rounded ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

function formatCategoryName(categories, categoryId) {
  const c = categories.find(x => x.id === categoryId);
  return c ? c.name : 'All';
}

// PUBLIC_INTERFACE
function App() {
  /** Main app state */
  const userId = useMemo(() => getUserId(), []);
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [q, setQ] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [view, setView] = useState('browse'); // browse | favorites | detail

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [myRating, setMyRating] = useState(null);

  const [favoriteIds, setFavoriteIds] = useState(new Set());

  const showToast = msg => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), 2200);
  };

  const refreshFavorites = async () => {
    const favs = await listFavorites(userId);
    const ids = new Set((favs.items || []).map(r => r.id));
    setFavoriteIds(ids);
  };

  const refreshBrowse = async () => {
    setLoading(true);
    try {
      const resp = await listRecipes({
        categoryId: activeCategoryId || undefined,
        q: q.trim() || undefined,
        ingredients: ingredients.trim() || undefined,
      });
      setRecipes(resp.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const cs = await listCategories();
      setCategories(cs);
      await refreshFavorites();
      await refreshBrowse();
    })().catch(err => {
      showToast(err.message || 'Failed to load data');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (view !== 'browse') return;
    refreshBrowse().catch(err => showToast(err.message || 'Failed to load recipes'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId]);

  const openDetail = async recipeId => {
    setView('detail');
    setSelectedRecipeId(recipeId);
    setSelectedRecipe(null);
    setMyRating(null);

    try {
      const [recipe, rating] = await Promise.all([
        getRecipe(recipeId),
        getMyRating(recipeId, userId),
      ]);
      setSelectedRecipe(recipe);
      setMyRating(rating?.rating ?? null);
    } catch (err) {
      showToast(err.message || 'Failed to load recipe');
    }
  };

  const toggleFavorite = async recipeId => {
    const isFav = favoriteIds.has(recipeId);
    try {
      if (isFav) {
        await removeFavorite(recipeId, userId);
        showToast('Removed from favorites');
      } else {
        await addFavorite(recipeId, userId);
        showToast('Saved to favorites');
      }
      await refreshFavorites();
    } catch (err) {
      showToast(err.message || 'Failed to update favorite');
    }
  };

  const setRating = async ratingValue => {
    if (!selectedRecipeId) return;
    try {
      await upsertRating(selectedRecipeId, userId, ratingValue);
      setMyRating(ratingValue);
      showToast('Rating saved');
      // refresh detail so avg updates
      const updated = await getRecipe(selectedRecipeId);
      setSelectedRecipe(updated);
      // refresh lists too
      if (view !== 'favorites') {
        await refreshBrowse();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save rating');
    }
  };

  const goBrowse = async () => {
    setView('browse');
    setSelectedRecipeId(null);
    setSelectedRecipe(null);
    await refreshBrowse();
  };

  const goFavorites = async () => {
    setView('favorites');
    setSelectedRecipeId(null);
    setSelectedRecipe(null);
    setLoading(true);
    try {
      const resp = await listFavorites(userId);
      setRecipes(resp.items || []);
    } catch (err) {
      showToast(err.message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSearch = async e => {
    e.preventDefault();
    setView('browse');
    await refreshBrowse().catch(err => showToast(err.message || 'Failed to search'));
  };

  return (
    <>
      <div className="navbar">
        <div className="container navbar-inner">
          <div className="brand" role="banner">
            <div className="brand-badge" aria-hidden="true">
              R
            </div>
            <div>Recipe Explorer</div>
          </div>

          <nav className="nav-links" aria-label="Primary navigation">
            <a
              href="#browse"
              className={`pill ${view === 'browse' ? 'active' : ''}`}
              onClick={e => {
                e.preventDefault();
                goBrowse().catch(() => {});
              }}
            >
              Browse
            </a>
            <a
              href="#favorites"
              className={`pill ${view === 'favorites' ? 'active' : ''}`}
              onClick={e => {
                e.preventDefault();
                goFavorites().catch(() => {});
              }}
            >
              Favorites ({favoriteIds.size})
            </a>
          </nav>
        </div>
      </div>

      <main className="main">
        <div className="container">
          {view !== 'detail' ? (
            <section className="hero" aria-label="Search and filters">
              <h1 className="hero-title">
                {view === 'favorites' ? 'Your Favorites' : 'Discover recipes'}
              </h1>
              <p className="hero-sub">
                Filter by category, search by ingredients, save favorites, and rate recipes.
              </p>

              <form className="toolbar" onSubmit={onSubmitSearch}>
                <div className="search-row">
                  <input
                    className="input"
                    placeholder="Search by name or description…"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    aria-label="Search recipes"
                  />
                  <input
                    className="input"
                    placeholder="Ingredients (comma-separated)…"
                    value={ingredients}
                    onChange={e => setIngredients(e.target.value)}
                    aria-label="Search by ingredients"
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select
                    className="input"
                    value={activeCategoryId || ''}
                    onChange={e => setActiveCategoryId(e.target.value || null)}
                    aria-label="Category filter"
                    disabled={view === 'favorites'}
                    style={{ paddingRight: 34 }}
                  >
                    <option value="">All categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <button className="btn btn-primary" type="submit">
                    Search
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setQ('');
                      setIngredients('');
                      setActiveCategoryId(null);
                      setView('browse');
                      refreshBrowse().catch(() => {});
                    }}
                  >
                    Reset
                  </button>
                </div>
              </form>

              {toast ? <div className="toast" role="status">{toast}</div> : null}
            </section>
          ) : null}

          {view === 'detail' ? (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button className="btn btn-ghost" onClick={() => goBrowse().catch(() => {})}>
                  ← Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => toggleFavorite(selectedRecipeId).catch(() => {})}
                >
                  {favoriteIds.has(selectedRecipeId) ? '★ Favorited' : '☆ Save favorite'}
                </button>
              </div>

              <div className="split">
                <section className="panel" aria-label="Recipe detail">
                  {!selectedRecipe ? (
                    <p className="muted">Loading…</p>
                  ) : (
                    <>
                      <h2 style={{ marginTop: 0 }}>{selectedRecipe.title}</h2>
                      <div className="card-meta">
                        <span className="badge">
                          {formatCategoryName(categories, selectedRecipe.category_id)}
                        </span>
                        <span>
                          <Stars value={selectedRecipe.avg_rating} />{' '}
                          <span className="muted">
                            ({selectedRecipe.rating_count || 0})
                          </span>
                        </span>
                        <span className="muted">
                          {selectedRecipe.prep_minutes}m prep · {selectedRecipe.cook_minutes}m
                          cook
                        </span>
                      </div>

                      <p className="muted">{selectedRecipe.description}</p>

                      <h3>Ingredients</h3>
                      <ul className="list">
                        {selectedRecipe.ingredients.map((ing, idx) => (
                          <li key={idx}>{ing}</li>
                        ))}
                      </ul>

                      <h3 style={{ marginTop: 14 }}>Instructions</h3>
                      <ol className="list">
                        {selectedRecipe.instructions.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </>
                  )}
                </section>

                <aside className="panel" aria-label="Rating and actions">
                  <h3 style={{ marginTop: 0 }}>Your rating</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Rate this recipe from 1–5.
                  </p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map(v => (
                      <button
                        key={v}
                        className={`btn ${myRating === v ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setRating(v)}
                        aria-label={`Set rating to ${v}`}
                      >
                        {v} ★
                      </button>
                    ))}
                  </div>

                  {toast ? <div className="toast" role="status">{toast}</div> : null}
                </aside>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 14 }}>
                <div className="muted" style={{ fontSize: 13 }}>
                  {view === 'favorites'
                    ? `Showing ${recipes.length} favorites`
                    : `Category: ${formatCategoryName(categories, activeCategoryId)} · Showing ${recipes.length} recipes`}
                </div>
              </div>

              {loading ? <p className="muted">Loading…</p> : null}

              <div className="grid" aria-label="Recipe grid">
                {recipes.map(r => (
                  <article className="card" key={r.id}>
                    <div className="card-body">
                      <h3 className="card-title">{r.title}</h3>
                      <div className="card-meta">
                        <span className="badge">{formatCategoryName(categories, r.category_id)}</span>
                        <span>
                          <Stars value={r.avg_rating} />{' '}
                          <span className="muted">({r.rating_count || 0})</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button className="btn btn-primary" onClick={() => openDetail(r.id)}>
                          View
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => toggleFavorite(r.id).catch(() => {})}
                          aria-label="Toggle favorite"
                        >
                          {favoriteIds.has(r.id) ? '★' : '☆'} Favorite
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {toast ? <div className="toast" role="status">{toast}</div> : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
