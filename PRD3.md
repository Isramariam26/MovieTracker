

---

# 📄 Product Requirements Document (PRD)

## Product Name (Working Title): CineTrack

---

## 1. Product Overview

### 1.1 Vision

To create a **simple, centralized, and user-friendly movie tracking web application** accessible to users of all age groups globally. CineTrack will allow users to track watched movies, rate and review them, manage watchlists, and receive personalized recommendations — all in one easy-to-use platform.

### 1.2 Mission

Eliminate the need for multiple apps by providing a single, intuitive movie tracking platform that combines ratings, reviews, watch status tracking, and intelligent recommendations.

---

## 2. Problem Statement

### 2.1 User Problems

1. There is **no centralized platform** that combines:

   * Ratings
   * Reviews
   * Watchlist management
   * Personalized recommendations

2. Existing platforms are:

   * Overcomplicated
   * Not intuitive for older users
   * Cluttered with excessive features

3. Users struggle to:

   * Remember what they’ve watched
   * Track what they are currently watching
   * Discover movies aligned with their preferences

---

## 3. Target Audience

### Primary Audience

* Global audience
* All age groups
* Casual movie watchers
* Families
* Non-technical users (especially older users)

### User Personas

**Persona 1: Casual Viewer (Age 25–40)**
Wants a simple way to track watched movies and discover new ones.

**Persona 2: Older User (Age 50+)**
Needs a clean, minimal interface without technical complexity.

**Persona 3: Movie Enthusiast (Age 18–35)**
Likes rating and reviewing movies publicly.

---

## 4. Product Scope (MVP – Web App)

### Platform

* Web Application (Responsive Design for desktop + mobile browsers)

### Authentication

* Google Login (OAuth 2.0)
* No manual email/password signup for MVP

---

## 5. Core Features (MVP)

### 5.1 User Account & Profile

* Sign in with Google
* Profile page includes:

  * Profile picture (Google avatar)
  * Display name
  * Total movies watched
  * Watchlist count
  * Average rating given

---

### 5.2 Movie Browsing

* Search bar (movie title search)
* Browse by:

  * Genre
  * Trending
  * Top Rated
  * Recently Released

Movie detail page includes:

* Poster
* Title
* Genre
* Release year
* Description
* Average rating
* User reviews (public)

---

### 5.3 Watch Status Tracking

Users can mark movies as:

* ✅ Watched
* 🎬 Watching
* ➕ Add to Watchlist

Users can remove or update status anytime.

---

### 5.4 Rating System

* 5-star rating system (1–5 stars)
* Users can rate only once per movie
* Ratings can be updated

---

### 5.5 Public Reviews

* Text-based reviews
* Visible to all users
* Displayed chronologically
* Shows:

  * Reviewer name
  * Rating
  * Date

(No commenting system in MVP to maintain simplicity.)

---

### 5.6 Personalized Recommendations

Recommendation Engine Based On:

* Movies marked as Watched
* Movies in Watchlist
* User ratings
* Genre patterns
* Average rating behavior

Logic Example:

* If user rates multiple Action movies highly → Recommend highly rated Action movies.
* If watchlist includes Sci-Fi → Recommend trending Sci-Fi films.

Recommendations section:

* “Recommended For You” on homepage
* Dynamically updated

---

## 6. User Experience (UX) Principles

### 6.1 Simplicity First

* Minimal design
* Large readable fonts
* High contrast UI
* Clear buttons

### 6.2 Accessibility

* Easy navigation
* Simple labels (no technical jargon)
* Mobile-responsive layout
* Support for screen readers

### 6.3 Clean Interface

* No clutter
* No complex menus
* Clear call-to-action buttons:

  * “Mark as Watched”
  * “Add to Watchlist”
  * “Rate”

---

## 7. User Flow

### First-Time User Flow

1. Visit website
2. Click “Sign in with Google”
3. Complete login
4. Land on homepage
5. Browse or search movies
6. Add to watchlist or mark as watched
7. Rate movie
8. View personalized recommendations

---

## 8. Non-Functional Requirements

### Performance

* Page load time < 2 seconds
* Fast search results

### Scalability

* Architecture supports global users
* Cloud-hosted backend

### Security

* Google OAuth authentication
* Secure API calls (HTTPS)
* Data encryption in transit

### Privacy

* Users control their ratings and watchlist
* Reviews are public by default

---

## 9. Success Metrics (KPIs)

### Engagement Metrics

* % of users adding at least 1 movie
* Average ratings per user
* Watchlist creation rate
* Daily Active Users (DAU)

### Retention Metrics

* 7-day retention rate
* 30-day retention rate

### Recommendation Effectiveness

* % of recommended movies added to watchlist
* Click-through rate on recommendations

---

## 10. Future Enhancements (Post-MVP)

* Social features (likes on reviews)
* Follow other users
* Comment on reviews
* Advanced AI-based recommendation engine
* Streaming platform availability integration
* Mobile app (iOS/Android)
* Multi-language support
* Dark mode
* Parental controls

---

## 11. Technical Architecture (High-Level)

Frontend:

* React / Next.js
* Responsive UI framework

Backend:

* Node.js / Express
* REST API

Database:

* PostgreSQL / MongoDB

Authentication:

* Google OAuth 2.0

Hosting:

* Cloud (AWS / Vercel / GCP)

---

## 12. Risks & Mitigation

| Risk                 | Mitigation                                 |
| -------------------- | ------------------------------------------ |
| Overcomplication     | Strict MVP feature discipline              |
| Poor recommendations | Start simple, improve with usage data      |
| Low engagement       | Focus on smooth onboarding                 |
| Accessibility gaps   | Conduct usability testing with older users |

---

# Final Product Definition (MVP)

CineTrack is a globally accessible, user-friendly movie tracking web app that centralizes watch status tracking, ratings, public reviews, and personalized recommendations — built with simplicity and accessibility at its core.
VITE_TMDB_API_KEY=0431f0cff720c4dd6df18d42e25c3acb

