import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT ?? 4000)
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'replace-me-in-env'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ?? `http://localhost:${PORT}/auth/google/callback`

const DATA_DIR = path.resolve(__dirname, '..', 'data')
const STORE_FILE = path.join(DATA_DIR, 'store.json')

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(STORE_FILE)
  } catch {
    const initial = { users: {}, reviews: [] }
    await fs.writeFile(STORE_FILE, JSON.stringify(initial, null, 2), 'utf-8')
  }
}

async function readStore() {
  await ensureStore()
  const raw = await fs.readFile(STORE_FILE, 'utf-8')
  try {
    const parsed = JSON.parse(raw)
    return {
      users: parsed.users ?? {},
      reviews: parsed.reviews ?? [],
    }
  } catch {
    return { users: {}, reviews: [] }
  }
}

async function writeStore(data) {
  await ensureStore()
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((user, done) => done(null, user))

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      (_accessToken, _refreshToken, profile, done) => {
        const user = {
          id: profile.id,
          displayName: profile.displayName,
          email: profile.emails?.[0]?.value ?? '',
          avatar: profile.photos?.[0]?.value ?? '',
        }
        done(null, user)
      },
    ),
  )
}

const app = express()

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
)

app.use(express.json())
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
)
app.use(passport.initialize())
app.use(passport.session())

function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/me', async (req, res) => {
  if (!req.user) {
    res.json({ user: null })
    return
  }

  const store = await readStore()
  const userId = req.user.id
  const existing = store.users[userId] ?? { watchStates: {}, ratings: {} }
  store.users[userId] = {
    ...existing,
    profile: req.user,
  }
  await writeStore(store)

  res.json({ user: req.user })
})

app.get('/api/user-data', requireAuth, async (req, res) => {
  const store = await readStore()
  const userId = req.user.id
  const userRecord = store.users[userId] ?? { watchStates: {}, ratings: {}, profile: req.user }
  store.users[userId] = userRecord
  await writeStore(store)

  res.json({
    watchStates: userRecord.watchStates ?? {},
    ratings: userRecord.ratings ?? {},
  })
})

app.get('/api/reviews/:movieId', async (req, res) => {
  const movieId = Number(req.params.movieId)
  const store = await readStore()
  const reviews = store.reviews
    .filter((review) => review.movieId === movieId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ reviews })
})

app.put('/api/status', requireAuth, async (req, res) => {
  const { movieId, status } = req.body ?? {}
  if (!Number.isFinite(movieId)) {
    res.status(400).json({ error: 'Invalid movieId' })
    return
  }
  if (status !== 'watched' && status !== 'watching' && status !== 'watchlist' && status !== null) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  const store = await readStore()
  const userId = req.user.id
  const userRecord = store.users[userId] ?? { watchStates: {}, ratings: {}, profile: req.user }
  userRecord.watchStates = userRecord.watchStates ?? {}
  if (status === null) {
    delete userRecord.watchStates[movieId]
  } else {
    userRecord.watchStates[movieId] = status
  }
  store.users[userId] = userRecord
  await writeStore(store)
  res.json({ watchStates: userRecord.watchStates })
})

app.put('/api/rating', requireAuth, async (req, res) => {
  const { movieId, rating } = req.body ?? {}
  if (!Number.isFinite(movieId)) {
    res.status(400).json({ error: 'Invalid movieId' })
    return
  }
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    res.status(400).json({ error: 'Invalid rating' })
    return
  }

  const store = await readStore()
  const userId = req.user.id
  const userRecord = store.users[userId] ?? { watchStates: {}, ratings: {}, profile: req.user }
  userRecord.ratings = userRecord.ratings ?? {}
  if (rating === null) {
    delete userRecord.ratings[movieId]
  } else {
    userRecord.ratings[movieId] = rating
  }
  store.users[userId] = userRecord
  await writeStore(store)
  res.json({ ratings: userRecord.ratings })
})

app.post('/api/reviews', requireAuth, async (req, res) => {
  const { movieId, content, rating } = req.body ?? {}
  if (!Number.isFinite(movieId)) {
    res.status(400).json({ error: 'Invalid movieId' })
    return
  }
  if (typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'Review content is required' })
    return
  }
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    res.status(400).json({ error: 'Invalid rating' })
    return
  }

  const store = await readStore()
  const review = {
    id: `${movieId}-${Date.now()}`,
    movieId,
    author: req.user.displayName,
    rating,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    userId: req.user.id,
  }
  store.reviews = [review, ...(store.reviews ?? [])]
  await writeStore(store)
  res.status(201).json({ review })
})

app.post('/auth/logout', (req, res, next) => {
  req.logout((error) => {
    if (error) {
      next(error)
      return
    }
    req.session.destroy((sessionError) => {
      if (sessionError) {
        next(sessionError)
        return
      }
      res.clearCookie('connect.sid')
      res.json({ ok: true })
    })
  })
})

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/?auth=failed` }),
    (_req, res) => {
      res.redirect(`${FRONTEND_URL}/?auth=success`)
    },
  )
} else {
  app.get('/auth/google', (_req, res) => {
    res.status(500).json({ error: 'Google OAuth is not configured on the server' })
  })
}

app.listen(PORT, async () => {
  await ensureStore()
  console.log(`API server running on http://localhost:${PORT}`)
})
