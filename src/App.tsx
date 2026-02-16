import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Movie = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
}

type Genre = {
  id: number
  name: string
}

type WatchState = 'watched' | 'watching' | 'watchlist'

type UserReview = {
  id: string
  movieId: number
  author: string
  rating: number | null
  content: string
  createdAt: string
}

type AuthUser = {
  id: string
  displayName: string
  email: string
  avatar: string
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500'
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined
const TMDB_READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN as string | undefined
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

const fallbackGenres: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 18, name: 'Drama' },
  { id: 35, name: 'Comedy' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
]

const fallbackMovies: Movie[] = [
  {
    id: 90001,
    title: 'North Star Signal',
    overview:
      'An ex-journalist uncovers a conspiracy hidden in analog radio broadcasts across remote Arctic towns.',
    poster_path: null,
    release_date: '2024-11-10',
    vote_average: 7.8,
    vote_count: 1290,
    genre_ids: [53, 18],
  },
  {
    id: 90002,
    title: 'Velvet Orbit',
    overview:
      'A retired pilot agrees to one final deep-space courier mission and discovers a fractured colony in silence.',
    poster_path: null,
    release_date: '2025-03-22',
    vote_average: 8.1,
    vote_count: 1824,
    genre_ids: [878, 18],
  },
  {
    id: 90003,
    title: 'Brass Avenue',
    overview:
      'A chaotic family-run cinema fights to survive in a city where blockbuster chains are buying every neighborhood screen.',
    poster_path: null,
    release_date: '2023-09-14',
    vote_average: 7.1,
    vote_count: 842,
    genre_ids: [35, 18],
  },
]

const fallbackReviews: UserReview[] = [
  {
    id: 'seed-1',
    movieId: 90001,
    author: 'Mara P.',
    rating: 4,
    content: 'Slow start, but the final act is excellent and the atmosphere is unforgettable.',
    createdAt: '2026-01-29T10:00:00.000Z',
  },
  {
    id: 'seed-2',
    movieId: 90002,
    author: 'Dev K.',
    rating: 5,
    content: 'One of the best sci-fi dramas I have seen in years.',
    createdAt: '2026-02-02T14:45:00.000Z',
  },
]

const statusLabel: Record<WatchState, string> = {
  watched: 'Watched',
  watching: 'Watching',
  watchlist: 'Watchlist',
}

function toPosterUrl(path: string | null): string | null {
  return path ? `${TMDB_IMAGE_URL}${path}` : null
}

function formatYear(releaseDate: string): string {
  return releaseDate ? new Date(releaseDate).getFullYear().toString() : 'N/A'
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getMovieGenres(movie: Movie, genreMap: Record<number, string>): string[] {
  if (movie.genres && movie.genres.length) {
    return movie.genres.map((g) => g.name)
  }
  return (movie.genre_ids ?? []).map((id) => genreMap[id]).filter(Boolean)
}

async function fetchTmdb(
  path: string,
  params: Record<string, string | number | boolean> = {},
): Promise<Response> {
  const requestParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    requestParams.set(key, String(value))
  }

  const headers: Record<string, string> = {}

  if (TMDB_API_KEY) {
    requestParams.set('api_key', TMDB_API_KEY)
  } else if (TMDB_READ_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${TMDB_READ_ACCESS_TOKEN}`
  } else {
    throw new Error('TMDB credentials missing')
  }

  const queryString = requestParams.toString()
  const response = await fetch(`${TMDB_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`, {
    headers,
  })

  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status})`)
  }

  return response
}

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [movies, setMovies] = useState<Movie[]>([])
  const [recommendations, setRecommendations] = useState<Movie[]>([])
  const [genres, setGenres] = useState<Genre[]>(fallbackGenres)
  const [feed, setFeed] = useState<'trending' | 'top-rated' | 'recent' | 'genre'>('trending')
  const [selectedGenre, setSelectedGenre] = useState<number>(28)
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null)
  const [watchStates, setWatchStates] = useState<Record<number, WatchState>>({})
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [reviews, setReviews] = useState<UserReview[]>(fallbackReviews)
  const [reviewDraft, setReviewDraft] = useState('')

  const isSignedIn = Boolean(currentUser)
  const profile = {
    displayName: currentUser?.displayName ?? 'Guest Viewer',
    avatar:
      currentUser?.avatar ||
      'https://images.unsplash.com/photo-1570158268183-d296b2892211?auto=format&fit=crop&w=160&q=80',
  }

  const genreMap = useMemo(
    () =>
      genres.reduce<Record<number, string>>((acc, genre) => {
        acc[genre.id] = genre.name
        return acc
      }, {}),
    [genres],
  )

  const moviesWithUserState = useMemo(
    () =>
      movies.map((movie) => ({
        ...movie,
        userRating: ratings[movie.id] ?? null,
        userStatus: watchStates[movie.id] ?? null,
      })),
    [movies, ratings, watchStates],
  )

  const stats = useMemo(() => {
    const values = Object.values(ratings)
    const avgRating = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const watchedCount = Object.values(watchStates).filter((state) => state === 'watched').length
    const watchlistCount = Object.values(watchStates).filter((state) => state === 'watchlist').length
    return {
      watchedCount,
      watchlistCount,
      avgRating,
    }
  }, [ratings, watchStates])

  const activeMovieReviews = useMemo(
    () =>
      activeMovie
        ? reviews
            .filter((review) => review.movieId === activeMovie.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [],
    [activeMovie, reviews],
  )

  const mergeMovieReviews = (movieId: number, incoming: UserReview[]) => {
    setReviews((current) => [
      ...incoming,
      ...current.filter((review) => review.movieId !== movieId),
    ])
  }

  const loadSession = async () => {
    if (!API_BASE_URL) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' })
      const data = (await response.json()) as { user: AuthUser | null }
      setCurrentUser(data.user)
    } catch {
      setCurrentUser(null)
    }
  }

  const loadUserData = async () => {
    if (!API_BASE_URL || !isSignedIn) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-data`, { credentials: 'include' })
      if (!response.ok) return
      const data = (await response.json()) as {
        watchStates?: Record<number, WatchState>
        ratings?: Record<number, number>
      }
      setWatchStates(data.watchStates ?? {})
      setRatings(data.ratings ?? {})
    } catch {
      setError('Could not load your saved tracking data.')
    }
  }

  const loadReviewsForMovie = async (movieId: number) => {
    if (!API_BASE_URL) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/${movieId}`, {
        credentials: 'include',
      })
      if (!response.ok) return
      const data = (await response.json()) as { reviews?: UserReview[] }
      mergeMovieReviews(movieId, data.reviews ?? [])
    } catch {
      // Keep fallback/local reviews if backend is unavailable.
    }
  }

  const loadGenres = async () => {
    if (!TMDB_API_KEY && !TMDB_READ_ACCESS_TOKEN) {
      setGenres(fallbackGenres)
      return
    }
    try {
      const response = await fetchTmdb('/genre/movie/list', { language: 'en-US' })
      const data = (await response.json()) as { genres?: Genre[] }
      if (data.genres?.length) {
        setGenres(data.genres)
      }
    } catch {
      setGenres(fallbackGenres)
    }
  }

  const loadMovies = async () => {
    setLoading(true)
    setError(null)

    if (!TMDB_API_KEY && !TMDB_READ_ACCESS_TOKEN) {
      setMovies(fallbackMovies)
      setRecommendations(fallbackMovies.slice(0, 2))
      setActiveMovie((current) => current ?? fallbackMovies[0] ?? null)
      setLoading(false)
      return
    }

    try {
      let path = ''
      let params: Record<string, string | number | boolean> = {}
      const trimmedQuery = query.trim()
      if (trimmedQuery) {
        path = '/search/movie'
        params = { query: trimmedQuery, include_adult: false, language: 'en-US', page: 1 }
      } else if (feed === 'top-rated') {
        path = '/movie/top_rated'
        params = { language: 'en-US', page: 1 }
      } else if (feed === 'recent') {
        path = '/discover/movie'
        params = { sort_by: 'primary_release_date.desc', 'vote_count.gte': 50, page: 1 }
      } else if (feed === 'genre') {
        path = '/discover/movie'
        params = { with_genres: selectedGenre, sort_by: 'popularity.desc', page: 1 }
      } else {
        path = '/trending/movie/week'
      }

      const response = await fetchTmdb(path, params)
      const data = (await response.json()) as { results?: Movie[] }
      const nextMovies = data.results?.slice(0, 24) ?? []
      setMovies(nextMovies)
      setActiveMovie(nextMovies[0] ?? null)
      if (trimmedQuery && nextMovies.length === 0) {
        setError(`No results found for "${trimmedQuery}".`)
      }
    } catch {
      setError('Could not load movies right now. Showing offline sample data.')
      setMovies(fallbackMovies)
      setActiveMovie((current) => current ?? fallbackMovies[0] ?? null)
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendations = async () => {
    const rankedGenres = Object.entries(
      movies.reduce<Record<number, number>>((acc, movie) => {
        const status = watchStates[movie.id]
        const rating = ratings[movie.id] ?? 0
        const isWeighted = status === 'watched' || status === 'watchlist' || rating >= 4
        if (!isWeighted) return acc
        for (const genreId of movie.genre_ids ?? []) {
          acc[genreId] = (acc[genreId] ?? 0) + (rating >= 4 ? 2 : 1)
        }
        return acc
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([genreId]) => Number(genreId))

    if ((!TMDB_API_KEY && !TMDB_READ_ACCESS_TOKEN) || rankedGenres.length === 0) {
      const fallback = movies
        .filter((movie) => !watchStates[movie.id] || watchStates[movie.id] === 'watchlist')
        .slice(0, 8)
      setRecommendations(fallback)
      return
    }

    try {
      const response = await fetchTmdb('/discover/movie', {
        with_genres: rankedGenres.join(','),
        sort_by: 'vote_average.desc',
        'vote_count.gte': 1000,
        page: 1,
      })
      const data = (await response.json()) as { results?: Movie[] }
      const recs = (data.results ?? []).filter((movie) => !watchStates[movie.id]).slice(0, 8)
      setRecommendations(recs)
    } catch {
      setRecommendations(movies.slice(0, 8))
    }
  }

  useEffect(() => {
    loadSession()
    loadGenres()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadMovies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, selectedGenre, query])

  useEffect(() => {
    loadRecommendations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies, watchStates, ratings])

  useEffect(() => {
    loadUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  useEffect(() => {
    if (activeMovie) {
      loadReviewsForMovie(activeMovie.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMovie?.id])

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuery(searchInput)
  }

  const onStatusChange = async (movieId: number, status: WatchState) => {
    setWatchStates((current) => ({ ...current, [movieId]: status }))
    if (!API_BASE_URL || !isSignedIn) return
    try {
      await fetch(`${API_BASE_URL}/api/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ movieId, status }),
      })
    } catch {
      setError('Could not save watch status.')
    }
  }

  const onRatingChange = async (movieId: number, rating: number) => {
    setRatings((current) => ({ ...current, [movieId]: rating }))
    if (!API_BASE_URL || !isSignedIn) return
    try {
      await fetch(`${API_BASE_URL}/api/rating`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ movieId, rating }),
      })
    } catch {
      setError('Could not save rating.')
    }
  }

  const onReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeMovie || !reviewDraft.trim()) return
    if (!isSignedIn || !API_BASE_URL) {
      const guestReview: UserReview = {
        id: `guest-${Date.now()}`,
        movieId: activeMovie.id,
        author: profile.displayName,
        rating: ratings[activeMovie.id] ?? null,
        content: reviewDraft.trim(),
        createdAt: new Date().toISOString(),
      }
      mergeMovieReviews(activeMovie.id, [guestReview, ...activeMovieReviews])
      setReviewDraft('')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          movieId: activeMovie.id,
          content: reviewDraft.trim(),
          rating: ratings[activeMovie.id] ?? null,
        }),
      })
      if (!response.ok) {
        setError('Could not publish review.')
        return
      }
      const data = (await response.json()) as { review: UserReview }
      mergeMovieReviews(activeMovie.id, [data.review, ...activeMovieReviews])
      setReviewDraft('')
    } catch {
      setError('Could not publish review.')
    }
  }

  return (
    <div className="app-shell">
      <div className="grain-overlay" />
      <header className="hero">
        <p className="badge">CineTrack / MVP</p>
        <h1>Track Every Film. Remember Every Feeling.</h1>
        <p className="hero-copy">
          A simplified movie companion for every generation. Search, rate, review, and get
          recommendations based on what you actually watch.
        </p>
        <div className="hero-actions">
          <span className="supporting-text">Guest mode enabled</span>
          <span className="supporting-text">
            {TMDB_API_KEY || TMDB_READ_ACCESS_TOKEN
              ? 'Live TMDB data connected'
              : 'Offline sample mode (set VITE_TMDB_API_KEY or VITE_TMDB_READ_ACCESS_TOKEN)'}
          </span>
        </div>
      </header>

      <main className="layout">
        <aside className="panel profile-panel">
          <div className="profile-head">
            <img src={profile.avatar} alt={`${profile.displayName} avatar`} />
            <div>
              <p className="panel-label">Profile</p>
              <h2>{profile.displayName}</h2>
            </div>
          </div>
          <div className="stats-grid">
            <article>
              <p>Watched</p>
              <strong>{stats.watchedCount}</strong>
            </article>
            <article>
              <p>Watchlist</p>
              <strong>{stats.watchlistCount}</strong>
            </article>
            <article>
              <p>Avg Rating</p>
              <strong>{stats.avgRating ? stats.avgRating.toFixed(1) : '0.0'}</strong>
            </article>
          </div>
          <p className="access-note">
            Built for clarity: large type, high contrast, clean actions, and mobile-first navigation.
          </p>
        </aside>

        <section className="panel browse-panel">
          <form className="search-row" onSubmit={onSearchSubmit}>
            <label htmlFor="movie-search" className="panel-label">
              Search Movies
            </label>
            <div className="search-controls">
              <input
                id="movie-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by title..."
              />
              <button className="primary-button" type="submit">
                Search
              </button>
            </div>
          </form>

          <div className="feed-filters">
            {[
              { value: 'trending', label: 'Trending' },
              { value: 'top-rated', label: 'Top Rated' },
              { value: 'recent', label: 'Recently Released' },
              { value: 'genre', label: 'By Genre' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={feed === item.value ? 'filter active' : 'filter'}
                onClick={() => {
                  setFeed(item.value as 'trending' | 'top-rated' | 'recent' | 'genre')
                  setQuery('')
                  setSearchInput('')
                }}
              >
                {item.label}
              </button>
            ))}
            {feed === 'genre' && (
              <select
                aria-label="Select genre"
                value={selectedGenre}
                onChange={(event) => setSelectedGenre(Number(event.target.value))}
              >
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}
          {loading ? <p className="loading-text">Loading movies...</p> : null}

          <div className="movie-grid" aria-live="polite">
            {moviesWithUserState.map((movie, index) => {
              const currentStatus = watchStates[movie.id]
              return (
                <article
                  className="movie-card"
                  key={movie.id}
                  style={{ animationDelay: `${Math.min(index * 60, 420)}ms` }}
                >
                  <button className="card-hitbox" type="button" onClick={() => setActiveMovie(movie)}>
                    {toPosterUrl(movie.poster_path) ? (
                      <img src={toPosterUrl(movie.poster_path) ?? ''} alt={`${movie.title} poster`} />
                    ) : (
                      <div className="poster-fallback">{movie.title.slice(0, 1)}</div>
                    )}
                  </button>
                  <div className="movie-meta">
                    <h3>{movie.title}</h3>
                    <p>
                      {formatYear(movie.release_date)} -{' '}
                      {getMovieGenres(movie, genreMap).slice(0, 2).join(' / ') || 'Unlisted Genre'}
                    </p>
                    <div className="status-buttons" role="group" aria-label={`Set watch status for ${movie.title}`}>
                      {(['watched', 'watching', 'watchlist'] as WatchState[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={currentStatus === status ? 'chip active' : 'chip'}
                          onClick={() => onStatusChange(movie.id, status)}
                        >
                          {statusLabel[status]}
                        </button>
                      ))}
                    </div>
                    <div className="rating-strip" role="group" aria-label={`Rate ${movie.title}`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          className={(ratings[movie.id] ?? 0) >= star ? 'star active' : 'star'}
                          onClick={() => onRatingChange(movie.id, star)}
                          aria-label={`${star} star`}
                        >
                          *
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="panel detail-panel">
          {activeMovie ? (
            <>
              <p className="panel-label">Movie Detail</p>
              <h2>{activeMovie.title}</h2>
              <p className="detail-meta">
                {formatYear(activeMovie.release_date)} - TMDB {activeMovie.vote_average.toFixed(1)} (
                {activeMovie.vote_count} votes)
              </p>
              <p className="overview">{activeMovie.overview || 'No synopsis available yet.'}</p>

              <section className="reviews">
                <h3>Public Reviews</h3>
                {activeMovieReviews.length === 0 ? (
                  <p className="supporting-text">
                    No reviews yet. Rate this movie and leave the first public review.
                  </p>
                ) : (
                  <ul>
                    {activeMovieReviews.map((review) => (
                      <li key={review.id}>
                        <header>
                          <strong>{review.author}</strong>
                          <span>
                            {review.rating ? `${review.rating}/5` : 'Unrated'} -{' '}
                            {formatDate(review.createdAt)}
                          </span>
                        </header>
                        <p>{review.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <form className="review-form" onSubmit={onReviewSubmit}>
                <label htmlFor="review-input">Write a review</label>
                <textarea
                  id="review-input"
                  value={reviewDraft}
                  onChange={(event) => setReviewDraft(event.target.value)}
                  rows={4}
                  placeholder="Share what stood out to you..."
                />
                <button className="primary-button" type="submit" disabled={!reviewDraft.trim()}>
                  Publish Review
                </button>
              </form>
            </>
          ) : (
            <p className="supporting-text">Select a movie to view details and post reviews.</p>
          )}
        </aside>
      </main>

      <section className="panel recommendations">
        <div className="recommendation-head">
          <div>
            <p className="panel-label">Recommended For You</p>
            <h2>Based on your watch history and rating patterns</h2>
          </div>
        </div>
        <div className="recommendation-row">
          {recommendations.slice(0, 8).map((movie) => (
            <button key={movie.id} className="recommendation-card" onClick={() => setActiveMovie(movie)}>
              <span>{movie.title}</span>
              <small>{getMovieGenres(movie, genreMap).slice(0, 2).join(' / ') || 'Discover pick'}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default App
