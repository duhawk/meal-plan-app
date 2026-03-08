# Ordo — Meal Plan Management

A private, mobile-first web application for managing a structured weekly meal plan. Ordo handles meal scheduling, RSVP tracking, late plate requests, member reviews, and administrative tooling — all behind a role-gated, chapter-based access code registration system. Designed for structured living environments such as fraternities, sororities, or communal houses.

---

## Table of Contents

- [Current State](#current-state)
- [Features](#features)
- [Statistical Analytics Engine](#statistical-analytics-engine)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Roles & Permissions](#roles--permissions)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Current State

**Branch:** `main` — active development

### What's Working
- Full meal scheduling, RSVP, late plate, and review flows
- Email verification and password reset via Resend API
- Image upload to AWS S3 (fully migrated from local storage)
- Multi-chapter data isolation (Chapter model + access-code registration)
- Weekly attendance presets (auto-RSVP and auto-late-plate patterns)
- Admin dashboard: analytics, user management, meal management, review moderation
- Statistical analytics engine: Welford online algorithm (mean + variance), EWMA trend smoothing (λ=0.94), and cross-sectional z-scoring on all rating and attendance data
- Frontend deployed (EC2 + nginx + HTTPS)
- Backend running on EC2 (port 5001 via Gunicorn + systemd)

### In Progress
- Chapter-scoping audit across all API queries (partially complete)
- API subdomain nginx configuration and SSL cert (Certbot)
- End-to-end multi-chapter registration testing

### Planned / Future
- Post-meal attendance confirmation prompts on home/menu view
- CSV attendance export
- Push notifications
- QR code attendance scanning
- JWT refresh tokens (longer sessions)
- Chapter management UI (super-admin)
- User meal preferences with auto-late-plate notifications

---

## Features

### For Members

- **Weekly Menu** — View the week's meals (Sunday–Saturday) grouped by day, Lunch and Dinner displayed side-by-side with color-coded labels (amber = Lunch, indigo = Dinner)
- **Today's Meals** — Quick view of today's scheduled meals, sorted Lunch before Dinner
- **RSVP** — Opt in or out of any upcoming meal; default is attending
- **Late Plate Requests** — Request a plate be saved for later pickup; includes optional notes and a desired pickup time; subject to per-meal deadlines set by admins
- **Meal Reviews** — Rate and comment on past meals (half-star precision, 0.5–5.0); edit or delete your own review at any time; submitting a review auto-marks you as attending
- **Aggregate Ratings** — Every enriched meal response includes `avg_rating` (Welford mean), `review_count`, `rating_std` (standard deviation — measures reviewer consensus), and `sharpe_analog` (mean ÷ std — quality-adjusted score that penalises divisive meals even when their average is high)
- **Past Meals** — Browse previous meals grouped by dish name with per-instance attendance history
- **Meal Recommendations** — Submit dish suggestions for future menus with optional description and link
- **Weekly Presets** — Set recurring weekly attendance patterns (e.g., "always attend Tuesday lunch, auto-request late plate on Thursday dinner") for automatic RSVP and late plate submission
- **Profile** — Update first/last name and change password (requires current password)

### For Admins

- **Meal Creation** — Generate a full week of Lunch/Dinner slots; autofill dish name and description from past meals via search; set per-meal late plate deadlines (hours before meal time); upload images to S3
- **Meal Editing** — Edit dish name, date, description, image, and late plate deadline for any existing meal
- **Meal Deletion** — Delete individual meals or an entire week's meals (with all cascading data)
- **Late Plate Management** — View today's and future pending requests grouped by meal; approve, deny, or reset status with optimistic UI; see member's desired pickup time and notes; nav badge with 30-second polling for pending count
- **Attendance Tracking** — View per-meal attendance breakdown: confirmed, no-shows, unconfirmed, and non-attendees
- **User Management** — View all members in the chapter; promote or demote admin status; delete accounts
- **Recommendations** — Review and delete member dish suggestions
- **Analytics Dashboard** — Summary stats (members, meals, reviews, avg rating); 8-week attendance trend with both raw `avg_per_meal` and EWMA-smoothed `ewma_avg_per_meal` (λ=0.94); top 10 meals by attendance percentage; top and bottom 5 meals by rating with cross-sectional `rating_zscore` (standard deviations from chapter baseline)

### For Owners (elevated admin)

- **Review Moderation** — View all reviews with member names; soft-hide reviews from member display (hidden reviews still count toward aggregate rating); permanently delete reviews
- **Access Code Management** — View, copy, and regenerate the chapter's registration access code
- **User Deletion** — Delete any member account (cannot delete other owners)
- All admin features above

---

## Statistical Analytics Engine

All statistical computation is implemented in `Backend/analytics.py`. The three algorithms below are applied at request time with no schema changes — they operate on data already present in the `reviews` and `meal_attendance` tables.

### Welford's Online Algorithm — Meal Rating Statistics

**File:** `analytics.py` → `WelfordAccumulator`, `welford_from_list`
**Wired into:** `helpers.py` → `_enrich_meals` (serves `/api/today-meals`, `/api/menu`)

Replaces the SQL `AVG()` + `COUNT()` aggregate with a single pass over raw rating rows using Knuth/Welford's numerically stable update rule:

```
delta  = x − mean
mean  += delta / n
M2    += delta × (x − mean)   ← uses already-updated mean
variance = M2 / (n − 1)       ← Bessel-corrected sample variance
```

The naive variance formula `(Σx²/n − mean²)` suffers from catastrophic floating-point cancellation at large n or with close values. Welford's accumulates deviations directly, remaining stable at any sample size.

**Fields added to every enriched meal response:**

| Field | Description |
|---|---|
| `avg_rating` | Welford mean (replaces SQL AVG) |
| `review_count` | n |
| `rating_std` | Sample standard deviation — measures reviewer consensus; low std = universal agreement, high std = divisive dish |
| `sharpe_analog` | `mean / std` — quality-adjusted score; a meal rated 4.5 with σ=1.6 scores lower than a meal rated 4.2 with σ=0.3 |

The `sharpe_analog` is structurally identical to the Sharpe ratio in portfolio analytics: reward (mean rating) divided by risk (rating dispersion). It surfaces a signal that `AVG` silently discards.

The accumulator also implements a `remove()` downdate for O(1) corrections when reviews are edited or deleted, without reprocessing all remaining ratings.

---

### EWMA — Attendance Trend Smoothing

**File:** `analytics.py` → `apply_ewma`
**Wired into:** `routes/admin.py` → `get_analytics` (serves `/api/admin/analytics`)

Applies an Exponentially Weighted Moving Average over the 8-week attendance time series:

```
EWMA_n = λ · EWMA_{n−1} + (1−λ) · x_n
```

λ=0.94 is the RiskMetrics standard decay factor. At this value, the half-life is:

```
t½ = −ln(2) / ln(0.94) ≈ 11.2 periods
```

Meaning a data point from ~11 weeks ago carries half the weight of the most recent week. Unlike an N-week simple moving average, there is no hard cliff where old data is abruptly dropped, and a single outlier week (travel, exams) does not permanently distort the trend.

**Field added to each `attendance_trend` entry:**

| Field | Description |
|---|---|
| `avg_per_meal` | Raw weekly average (unchanged) |
| `ewma_avg_per_meal` | EWMA-smoothed value at λ=0.94 |

---

### Cross-Sectional Z-Score — Meal Rating Normalisation

**File:** `analytics.py` → `apply_zscores`
**Wired into:** `routes/admin.py` → `get_analytics` (serves `/api/admin/analytics`)

Normalises each meal's `avg_rating` against the chapter's own distribution before ranking:

```
z_i = (x_i − μ) / σ
```

μ and σ are computed **cross-sectionally** — across all rated meals at once, not along a single meal's time series. This answers: "how many standard deviations above or below our own baseline is this dish?"

This removes the need for a fixed reference point. Whether your chapter rates generously (chapter mean 4.3) or harshly (chapter mean 3.1), a z-score of +2.0 means the same thing: genuinely exceptional relative to your own history. A z-score below −1.5 is a concrete signal to retire the dish.

Uses sample standard deviation (n−1 denominator via `statistics.stdev`).

**Field added to each entry in `highest_rated` and `lowest_rated`:**

| Field | Description |
|---|---|
| `avg_rating` | Raw average (unchanged) |
| `rating_zscore` | Standard deviations from chapter mean; +2.0 = exceptional, −1.5 = retire |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.1.0 | UI framework |
| Vite | 6.3.5 | Build tool and dev server |
| Tailwind CSS | 3.4.1 | Utility-first styling |
| React Router | 6.30.1 | Client-side routing |
| Lucide React | 0.469.0 | Icon library |
| Framer Motion | 11.18.2 | Animations and transitions |
| date-fns | 4.1.0 | Date manipulation |
| Axios | 1.11.0 | HTTP client (available; primary requests use native fetch via `api.js`) |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.13 | Runtime |
| Flask | 3.1.1 | Web framework |
| Flask-SQLAlchemy | 3.1.1 | ORM |
| Flask-Migrate / Alembic | 4.1.0 / 1.16.1 | Database migrations |
| Flask-Bcrypt | 1.0.1 | Password hashing |
| PyJWT | 2.10.1 | JWT authentication (HS256, 24h expiry) |
| Flask-CORS | 6.0.0 | Cross-origin requests |
| psycopg2-binary | 2.9.10 | PostgreSQL adapter |
| boto3 | 1.42.51 | AWS S3 SDK |
| APScheduler | 3.11.2 | Background task scheduling (nightly cleanup) |
| Resend | 2.22.0 | Transactional email (verification, password reset) |
| Gunicorn | 25.1.0 | WSGI production server |

### Infrastructure

| Component | Technology | Notes |
|---|---|---|
| Database | PostgreSQL | Hosted on EC2 (Ubuntu) |
| Image Storage | AWS S3 | Dedicated bucket for meal images |
| Email Service | Resend API | Verification and password reset emails |
| Backend Deployment | EC2 + Gunicorn + nginx + systemd | Port 5001, managed via `ordo.service` |
| Frontend Deployment | EC2 nginx static serving | Built dist served as static files |
| Authentication | JWT stored in localStorage | 24-hour tokens, Bearer header |

---

## Project Structure

```
Meal_plan/
├── README.md
├── PRD.md                              # Product Requirements Document
├── STP.md                              # Software Test Plan
├── deploy.md                           # AWS deployment guide
├── ordo.service                        # systemd service file for backend
│
├── Backend/
│   ├── app.py                          # Flask app factory — registers blueprints, CLI commands
│   ├── models.py                       # SQLAlchemy ORM models (9 tables)
│   ├── database.py                     # db instance init
│   ├── extensions.py                   # Flask extensions (Bcrypt)
│   ├── helpers.py                      # Auth decorators, S3 upload, meal enrichment (Welford wired here)
│   ├── analytics.py                    # Statistical analytics engine (Welford, EWMA, cross-sectional z-score)
│   ├── email_utils.py                  # Resend API integration (verification, password reset)
│   ├── requirements.txt                # Python dependencies
│   ├── Procfile                        # Gunicorn entry for Heroku-style deployment
│   ├── .env                            # Environment variables (not committed)
│   ├── migrations/                     # Alembic migration scripts
│   │   └── versions/
│   ├── routes/                         # API blueprints
│   │   ├── auth.py                     # Registration, login, email verification, password reset
│   │   ├── meals.py                    # CRUD meals, bulk create, search
│   │   ├── reviews.py                  # Submit, edit, delete, hide, moderation
│   │   ├── attendance.py               # RSVP toggle, post-meal confirmation, admin tracking
│   │   ├── late_plates.py              # Request/cancel late plates, admin approval workflow
│   │   ├── weekly_presets.py           # Weekly attendance patterns and auto-scheduling
│   │   └── admin.py                    # User management, analytics, settings, recommendations
│   └── uploads/                        # Legacy local image storage (replaced by S3)
│
└── Frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    ├── .env                            # VITE_API_URL for dev (not committed)
    ├── .env.production                 # VITE_API_URL for prod (not committed)
    └── src/
        ├── main.jsx                    # React entry point
        ├── App.jsx                     # App wrapper with UserProvider
        ├── routes.jsx                  # All routes + Protected / OwnerProtected guards
        ├── index.css                   # Global styles
        ├── theme.js                    # Theme config (color system, spacing)
        │
        ├── lib/
        │   └── api.js                  # fetch wrapper (auth headers, JSON, error handling)
        │
        ├── contexts/
        │   └── UserContext.jsx         # Global auth state (user, role, loading)
        │
        ├── layouts/
        │   └── PublicLayout.jsx        # Public marketing page shell
        │
        ├── components/
        │   ├── MobileShell.jsx         # Authenticated app shell (nav, header, badge)
        │   ├── MealCard.jsx            # Meal display (rating, RSVP, review, late plate)
        │   ├── MealReview.jsx          # Star rating + comment form (create & edit)
        │   ├── StarRating.jsx          # Read-only star display
        │   ├── Home.jsx                # Today's meals view
        │   ├── WeeklyMenu.jsx          # Day-grouped weekly menu
        │   ├── WeeklyPresets.jsx       # Weekly attendance pattern manager
        │   ├── Reviews.jsx             # Owner-only all-reviews page
        │   ├── Login.jsx
        │   ├── Register.jsx            # Includes access code field
        │   ├── Modal.jsx
        │   ├── landing/
        │   │   ├── Hero.jsx
        │   │   ├── FeatureGrid.jsx
        │   │   └── AttendanceChart.jsx
        │   └── ui/
        │       ├── Button.jsx          # Shared button (primary / secondary / danger)
        │       ├── Header.jsx
        │       ├── Footer.jsx
        │       └── ThemeToggle.jsx
        │
        └── pages/
            ├── public/
            │   ├── Home.jsx            # Marketing landing page
            │   └── Features.jsx
            ├── VerifyEmail.jsx         # Email verification redirect handler
            ├── ForgotPassword.jsx      # Forgot password form
            ├── ResetPassword.jsx       # Password reset form (token-based)
            ├── app/
            │   ├── PastMeals.jsx       # Past meals grouped by dish
            │   ├── MealRecommendationForm.jsx
            │   └── Profile.jsx         # Name + password update
            └── admin/
                ├── Admin.jsx           # Admin dashboard shell + nav tabs
                ├── AdminMeals.jsx      # Weekly meal creation
                ├── AdminLatePlates.jsx # Late plate approval workflow
                ├── AdminAttendance.jsx # Meal attendance overview
                ├── AdminUsers.jsx      # Member management
                ├── AdminReviews.jsx    # Owner-only review moderation
                ├── AdminRecommendations.jsx
                ├── AdminAnalytics.jsx  # Stats, trends, top/bottom meals
                ├── AdminSettings.jsx   # Owner-only access code management
                ├── EditMeal.jsx        # Edit an existing meal
                └── MealAttendanceDetails.jsx
```

---

## Data Models

### `Chapter` — Multi-tenancy unit
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String | Unique chapter name (e.g., "Alpha Chapter") |
| access_code | String | Unique; used at registration to assign users |
| created_at | DateTime | |

### `User`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| chapter_id | FK → Chapter | Set at registration via access code |
| email | String | Unique globally |
| password_hash | String | bcrypt |
| name | String | Derived from first + last |
| first_name | String | |
| last_name | String | |
| is_admin | Boolean | |
| is_owner | Boolean | Highest privilege tier |
| created_at | DateTime | |
| reset_token | String | Nullable; for password reset |
| reset_token_expires | DateTime | Nullable; 1-hour expiry |

### `PendingRegistration` — Pre-verification queue
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| email | String | Unique |
| password_hash | String | bcrypt |
| first_name | String | |
| last_name | String | |
| chapter_id | FK → Chapter | Nullable; resolved at registration |
| token | String | Unique; email verification token |
| token_expires | DateTime | 24-hour expiry |
| created_at | DateTime | |

### `Meal`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| chapter_id | FK → Chapter | Chapter-scoped |
| dish_name | String | |
| description | Text | |
| meal_date | DateTime | |
| meal_type | String | `"Lunch"` or `"Dinner"` |
| image_url | String | S3 object URL |
| late_plate_hours_before | Integer | Nullable; hours before meal time that requests close |
| created_at | DateTime | |

### `Review`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| meal_id | FK → Meal | |
| user_id | FK → User | |
| rating | Float | 0.5–5.0, half-star precision |
| comment | Text | Nullable |
| hidden | Boolean | Soft-hide by admin; still counts toward aggregate |
| created_at | DateTime | |
| — | Unique | (user_id, meal_id) — one review per user per meal |

### `MealAttendance`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| meal_id | FK → Meal | |
| user_id | FK → User | |
| attendance_time | DateTime | |
| confirmed | Boolean | Nullable — post-meal confirmation; null = pending |
| — | Unique | (user_id, meal_id) |

### `LatePlate`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| meal_id | FK → Meal | |
| user_id | FK → User | |
| notes | Text | Nullable |
| pickup_time | Time | Nullable — member's desired pickup time |
| status | String | `pending` / `approved` / `denied` |
| request_time | DateTime | |
| request_date | Date | |
| — | Unique | (user_id, meal_id, request_date) |

### `WeeklyPreset`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | FK → User | |
| day_of_week | Integer | 0 = Monday, 6 = Sunday |
| meal_type | String | `"Lunch"` or `"Dinner"` |
| attending | Boolean | Default true |
| late_plate | Boolean | Default false |
| late_plate_notes | Text | Nullable |
| late_plate_pickup_time | Time | Nullable |
| enabled | Boolean | Default true |
| created_at | DateTime | |
| — | Unique | (user_id, day_of_week, meal_type) |

### `Recommendation`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | FK → User | |
| meal_name | String | |
| description | Text | Nullable |
| link | String | Nullable |
| created_at | DateTime | |

### `HouseSettings` *(deprecated)*
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| key | String | Unique — e.g., `"access_code"` |
| value | String | Nullable |
| updated_at | DateTime | |

Superseded by `Chapter.access_code`. Retained for backwards compatibility.

---

## API Reference

All authenticated routes require `Authorization: Bearer <token>`. All chapter-scoped queries automatically filter by `g.current_user.chapter_id`.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | — | Register; validates access code; triggers email verification |
| POST | `/api/login` | — | Returns JWT + user object |
| GET | `/api/verify-email?token=` | — | Email verification redirect |
| POST | `/api/resend-verification` | — | Resend verification email |
| POST | `/api/forgot-password` | — | Send password reset email |
| POST | `/api/reset-password` | — | Complete reset with token |
| GET | `/api/me` | JWT | Current user profile + chapter info |
| PUT | `/api/me` | JWT | Update name / password |

### Meals

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/today-meals?date=YYYY-MM-DD` | JWT | Today's meals enriched with Welford stats (`avg_rating`, `rating_std`, `sharpe_analog`), reviews, attendance, and late plate status |
| GET | `/api/menu` | JWT | Current week's meals (Sunday–Saturday) — same Welford enrichment as today-meals |
| GET | `/api/past-meals` | JWT | Past meals grouped by dish name with attendance history |
| GET | `/api/meals/<id>` | JWT | Single meal details |
| GET | `/api/meals/search?q=` | Admin | Autocomplete for meal creation form |
| POST | `/api/meals` | Admin | Create a single meal (multipart/form-data, optional image) |
| POST | `/api/meals/bulk` | Admin | Batch create meals (JSON + multiple file uploads) |
| PUT | `/api/meals/<id>` | Admin | Edit a meal |
| DELETE | `/api/meals/<id>` | Admin | Delete a meal and all cascading data |
| DELETE | `/api/meals/week` | Admin | Delete all meals for a given week |

### Attendance

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/meals/<id>/attendance` | JWT | Toggle RSVP (creates or removes attendance record) |
| POST | `/api/meals/<id>/attendance/confirm` | JWT | Post-meal confirmation (`confirmed`: true / false / null) |
| GET | `/api/meals/<id>/attendance` | JWT | All attendees for a meal |
| GET | `/api/admin/attendance` | Admin | All attendance records (chapter-scoped) |
| GET | `/api/admin/meals/<id>/attendance-details` | Admin | Breakdown: confirmed, no-shows, unconfirmed, non-attendees |

### Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/meals/<id>/reviews` | JWT | Submit a review; auto-marks attending |
| PUT | `/api/meals/<id>/reviews/<rid>` | JWT | Edit own review |
| DELETE | `/api/meals/<id>/reviews/<rid>` | JWT | Delete own review (admin/owner can delete any) |
| GET | `/api/meals/<id>/reviews` | JWT | Get all (non-hidden) reviews for a meal |
| GET | `/api/admin/reviews` | Owner | All reviews with member names + hidden status |
| PUT | `/api/admin/reviews/<id>/hide` | Admin | Toggle soft-hide |
| DELETE | `/api/admin/reviews/<id>` | Owner | Permanently delete |

### Late Plates

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/meals/<id>/late-plates` | JWT | Request a late plate (checks deadline) |
| DELETE | `/api/meals/<id>/late-plates` | JWT | Cancel own late plate request |
| GET | `/api/meals/<id>/late-plates` | JWT | Late plates for a meal |
| GET | `/api/admin/late-plates/today` | Admin | Today's requests grouped by meal |
| GET | `/api/admin/late-plates/pending-count` | Admin | Count of pending requests for today/future |
| PUT | `/api/admin/late-plates/<id>/status` | Admin | Update status (pending / approved / denied) |

### Recommendations

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/recommendations` | JWT | Submit a dish recommendation |
| GET | `/api/admin/recommendations` | Admin | All recommendations with submitter info |
| DELETE | `/api/admin/recommendations/<id>` | Admin | Delete a recommendation |

### Weekly Presets

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/weekly-presets` | JWT | Current user's presets |
| POST | `/api/weekly-presets` | JWT | Create or update a preset |
| DELETE | `/api/weekly-presets/<id>` | JWT | Delete a preset |

### Admin — Users & Settings

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | All members in the chapter |
| DELETE | `/api/admin/users/<id>` | Owner | Delete a member (cannot delete owners) |
| PUT | `/api/admin/users/<id>/role` | Owner | Promote / demote admin |
| GET | `/api/admin/settings` | Owner | Chapter name + access code |
| PUT | `/api/admin/settings/access-code` | Owner | Set or regenerate access code |

### Admin — Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/analytics` | Admin | Summary stats; 8-week attendance trend with raw + EWMA (`ewma_avg_per_meal`, λ=0.94); top/bottom meals with cross-sectional `rating_zscore` |

---

## Authentication & Authorization

### Registration Flow
1. User submits email, password, name, and a valid **access code**
2. Backend resolves the access code to a `Chapter` record; invalid code is rejected
3. A `PendingRegistration` record is created with a 24-hour verification token
4. Verification email is sent via Resend API
5. User clicks the link → token validated → `User` record created from pending registration

### Login Flow
1. User submits email and password
2. Backend validates credentials (bcrypt comparison)
3. JWT created: `{ user_id, exp: now + 24h }`, signed with `JWT_SECRET`
4. Frontend stores token in localStorage; every request includes `Authorization: Bearer <token>`

### Password Reset Flow
1. User submits email at `/forgot-password`
2. Backend generates a 1-hour reset token stored on the `User` record
3. Reset email sent via Resend API
4. User submits new password with token at `/reset-password`
5. Token validated, password updated, token cleared

### Authorization Decorators (Backend)
- `@jwt_required` — User must be authenticated
- `@admin_required` — User must be admin or owner
- `@owner_required` — User must be owner

---

## Roles & Permissions

| Feature | Member | Admin | Owner |
|---|:---:|:---:|:---:|
| View meals, RSVP, late plates | ✅ | ✅ | ✅ |
| Submit / edit / delete own review | ✅ | ✅ | ✅ |
| View aggregate rating (3+ reviews) | ✅ | ✅ | ✅ |
| Manage weekly attendance presets | ✅ | ✅ | ✅ |
| Submit meal recommendations | ✅ | ✅ | ✅ |
| Manage meals (create, edit, delete) | — | ✅ | ✅ |
| Approve / deny late plates | — | ✅ | ✅ |
| View attendance breakdown per meal | — | ✅ | ✅ |
| Manage users / promote admins | — | ✅ | ✅ |
| View analytics dashboard | — | ✅ | ✅ |
| Manage recommendations | — | ✅ | ✅ |
| Soft-hide a review | — | ✅ | ✅ |
| View all reviews with member names | — | — | ✅ |
| Permanently delete any review | — | — | ✅ |
| Delete member accounts | — | — | ✅ |
| View / regenerate access code | — | — | ✅ |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.13
- PostgreSQL running locally

### Backend

```bash
cd Backend
python3 -m venv virtual
source virtual/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.

# Run migrations
flask db upgrade

# Create first chapter and owner
flask create-chapter "My Chapter" --access-code SECRET123
flask make-owner your@email.com

# Start the dev server (port 5001)
python app.py
```

### Frontend

```bash
cd Frontend
npm install

# Configure environment
echo "VITE_API_URL=http://127.0.0.1:5001" > .env

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend (`Backend/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ordo
JWT_SECRET=your-strong-random-secret
FLASK_APP=app.py

# Resend (email verification + password reset)
RESEND_API_KEY=your-resend-api-key
FRONTEND_URL=https://your-domain.com

# AWS S3 (image uploads)
AWS_BUCKET_NAME=your-s3-bucket-name
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### Frontend (`Frontend/.env`)

```env
VITE_API_URL=http://127.0.0.1:5001
```

### Frontend (`Frontend/.env.production`)

```env
VITE_API_URL=https://api.your-domain.com
```

---

## Deployment

The app is deployed on an AWS EC2 instance (Ubuntu) using nginx + Gunicorn.

### Architecture

```
Internet → your-domain.com    → nginx (EC2) → Frontend/dist/ (static files)
         → api.your-domain.com → nginx proxy → Gunicorn :5001 → Flask
```

### Backend Updates

```bash
ssh -i key.pem ubuntu@<ec2-ip>
cd ~/app && git pull
source Backend/virtual/bin/activate
pip install -r Backend/requirements.txt
flask db upgrade
sudo systemctl restart ordo
```

### Frontend Updates

```bash
cd Frontend
npm run build
scp -i key.pem -r dist/ ubuntu@<ec2-ip>:~/app/Frontend/
```

### systemd Service (`ordo.service`)

```ini
[Unit]
Description=Ordo Flask Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/path/to/app/Backend
Environment="PATH=/path/to/app/Backend/virtual/bin"
EnvironmentFile=/path/to/app/Backend/.env
ExecStart=/path/to/app/Backend/virtual/bin/gunicorn -w 4 -b 127.0.0.1:5001 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```
