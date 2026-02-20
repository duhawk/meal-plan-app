# Ordo — Meal Plan Management

A private, mobile-first web application for managing a structured weekly meal plan. Ordo handles meal scheduling, RSVP tracking, late plate requests, member reviews, and administrative tooling — all behind a role-gated access code registration system.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Roles & Permissions](#roles--permissions)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## Features

### For Members
- **Weekly Menu** — View the week's meals grouped by day, with Lunch and Dinner displayed side-by-side with color-coded labels
- **Today's Meals** — Quick view of today's scheduled meals, sorted Lunch before Dinner
- **RSVP** — Opt in or out of any upcoming meal; default is attending
- **Late Plate Requests** — Request a plate be saved for later pickup; includes optional notes and a desired pickup time; subject to per-meal deadlines set by admins
- **Meal Reviews** — Rate and comment on past meals (half-star precision); edit or delete your own review at any time
- **Aggregate Ratings** — Star rating and review count shown on meal cards once 3+ reviews exist
- **Past Meals** — Browse previous meals grouped by dish name with attendance history
- **Meal Recommendations** — Submit dish suggestions for future menus
- **Profile** — Update first/last name and change password

### For Admins
- **Meal Creation** — Generate a full week of Lunch/Dinner slots; autofill dish details from past meals via search; set per-meal late plate deadlines; upload images
- **Late Plate Management** — View today's requests grouped by meal; approve, deny, or reset status; see each member's desired pickup time; nav badge with 30-second polling for pending count
- **Attendance Tracking** — View attendance per meal with per-member detail
- **User Management** — View all members; promote/demote admin status; delete accounts
- **Recommendations** — Review member dish suggestions
- **Analytics Dashboard** — Summary stats (members, meals, reviews, avg rating); 8-week attendance trend chart; top 10 meals by attendance percentage; top and bottom 5 meals by rating

### For Owners (elevated admin)
- **Review Moderation** — View all reviews with member names; soft-hide reviews from display; permanently delete reviews
- **Access Code Management** — View, copy, and regenerate the organization's registration access code
- All admin features above

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 6 | Build tool and dev server |
| Tailwind CSS | 3 | Utility-first styling |
| React Router | 6 | Client-side routing |
| Lucide React | 0.469 | Icon library |
| Framer Motion | 11 | Animations |
| Axios | 1.11 | HTTP (available; primary requests use native fetch via `api.js`) |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.13 | Runtime |
| Flask | 3.1 | Web framework |
| Flask-SQLAlchemy | 3.1 | ORM |
| Flask-Migrate / Alembic | 4.1 / 1.16 | Database migrations |
| Flask-Bcrypt | 1.0 | Password hashing |
| PyJWT | 2.10 | JWT authentication |
| Flask-CORS | 6.0 | Cross-origin requests |
| psycopg2-binary | 2.9 | PostgreSQL adapter |
| boto3 | 1.42 | AWS S3 SDK (installed; S3 migration pending) |

### Infrastructure

| Component | Technology |
|---|---|
| Database | PostgreSQL |
| Image Storage | Local `/uploads` → AWS S3 (migration pending) |
| Deployment target | Railway / Render / Heroku |

---

## Project Structure

```
Meal_plan/
├── README.md
├── PRD.md                          # Product Requirements Document
├── STP.md                          # Software Test Plan
│
├── Backend/
│   ├── app.py                      # Flask application — all routes
│   ├── models.py                   # SQLAlchemy data models
│   ├── database.py                 # db instance init
│   ├── .env                        # Environment variables (not committed)
│   ├── uploads/                    # Local image storage (dev only)
│   ├── virtual/                    # Python virtual environment
│   └── migrations/
│       ├── env.py
│       └── versions/               # Alembic migration scripts
│
└── Frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    ├── .env                        # VITE_API_URL (not committed)
    └── src/
        ├── main.jsx                # React entry point
        ├── App.jsx
        ├── routes.jsx              # All client-side routes + route guards
        ├── index.css               # Global styles
        ├── theme.js                # Theme configuration
        │
        ├── lib/
        │   └── api.js              # fetch wrapper (auth headers, error handling)
        │
        ├── contexts/
        │   └── UserContext.jsx     # Global user state (auth, role)
        │
        ├── layouts/
        │   └── PublicLayout.jsx    # Public marketing page shell
        │
        ├── components/             # Shared/reusable components
        │   ├── MobileShell.jsx     # Authenticated app shell (nav, header, badge)
        │   ├── MealCard.jsx        # Meal display card (rating, RSVP, review, late plate)
        │   ├── MealReview.jsx      # Star rating + comment form (create & edit)
        │   ├── Home.jsx            # Today's meals view
        │   ├── WeeklyMenu.jsx      # Day-grouped weekly menu
        │   ├── Reviews.jsx         # Owner-only all-reviews page
        │   ├── Login.jsx
        │   ├── Register.jsx        # Includes access code field
        │   ├── Modal.jsx
        │   ├── StarRating.jsx      # Read-only star display
        │   ├── landing/            # Public landing page components
        │   │   ├── Hero.jsx
        │   │   ├── FeatureGrid.jsx
        │   │   └── AttendanceChart.jsx
        │   └── ui/
        │       ├── Button.jsx      # Shared button (primary / secondary / danger)
        │       ├── Header.jsx
        │       ├── Footer.jsx
        │       └── ThemeToggle.jsx
        │
        └── pages/
            ├── public/
            │   ├── Home.jsx        # Marketing landing page
            │   └── Features.jsx
            ├── app/
            │   ├── PastMeals.jsx   # Past meals grouped by dish
            │   ├── MealRecommendationForm.jsx
            │   └── Profile.jsx     # Name + password update
            └── admin/
                ├── Admin.jsx       # Admin dashboard shell + nav tabs
                ├── AdminMeals.jsx  # Weekly meal creation (day-grouped Lunch/Dinner)
                ├── AdminLatePlates.jsx   # Today's late plates + approve/deny
                ├── AdminAttendance.jsx   # Meal attendance overview
                ├── AdminUsers.jsx        # Member management
                ├── AdminReviews.jsx      # Owner-only review moderation
                ├── AdminRecommendations.jsx
                ├── AdminAnalytics.jsx    # Stats, trends, top/bottom meals
                ├── AdminSettings.jsx     # Owner-only access code management
                ├── EditMeal.jsx          # Edit an existing meal
                └── MealAttendanceDetails.jsx
```

---

## Data Models

### `User`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| email | String | Unique |
| name | String | Full name |
| first_name | String | |
| last_name | String | |
| password_hash | String | bcrypt |
| is_admin | Boolean | Admin or owner |
| is_owner | Boolean | Highest privilege tier |
| created_at | DateTime | |

### `Meal`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| dish_name | String | |
| description | String | |
| meal_date | DateTime | |
| meal_type | String | `"Lunch"` or `"Dinner"` |
| image_url | String | Relative path or S3 URL |
| late_plate_hours_before | Integer | Nullable — hours before meal time that late plate requests close |

### `Review`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| meal_id | FK → Meal | |
| user_id | FK → User | |
| rating | Float | 0.5–5.0, half-star precision |
| comment | Text | Nullable |
| hidden | Boolean | Soft-hide by admin; still counts toward avg |
| created_at | DateTime | |

### `MealAttendance`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| meal_id | FK → Meal | |
| user_id | FK → User | |
| attendance_time | DateTime | |
| confirmed | Boolean | Nullable — post-meal confirmation (pending feature) |

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

### `Recommendation`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | FK → User | |
| dish_name | String | |
| notes | Text | Nullable |
| created_at | DateTime | |

### `HouseSettings`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| key | String | Unique — e.g. `"access_code"` |
| value | String | Nullable |
| updated_at | DateTime | |

---

## API Reference

All authenticated routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | — | Register; validates access code if one is set |
| POST | `/api/login` | — | Returns JWT + user object |
| GET | `/api/me` | ✓ | Current user profile |
| PUT | `/api/me` | ✓ | Update name / password |

### Meals
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/today-meals` | ✓ | Today's meals with enriched data |
| GET | `/api/menu` | ✓ | Current week's meals with enriched data |
| GET | `/api/past-meals` | ✓ | Past meals grouped by dish name |
| GET | `/api/meals/search?q=` | ✓ | Autofill search for admin meal creation |
| POST | `/api/meals` | Admin | Create a single meal |
| POST | `/api/meals/bulk` | Admin | Create multiple meals at once |
| PUT | `/api/meals/<id>` | Admin | Edit a meal |
| DELETE | `/api/meals/<id>` | Admin | Delete a meal |

### Attendance
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/meals/<id>/attendance` | ✓ | Toggle RSVP |

### Reviews
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/meals/<id>/reviews` | ✓ | Submit a review |
| PUT | `/api/meals/<id>/reviews/<rid>` | ✓ | Edit own review |
| DELETE | `/api/meals/<id>/reviews/<rid>` | ✓ | Delete own review (admin/owner can delete any) |

### Late Plates
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/meals/<id>/late-plates` | ✓ | Request a late plate |

### Recommendations
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/recommendations` | ✓ | Submit a dish recommendation |

### Admin — Late Plates
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/late-plates/today` | Admin | Today's requests grouped by meal |
| GET | `/api/admin/late-plates/pending-count` | Admin | Count of today's pending requests |
| PUT | `/api/admin/late-plates/<id>/status` | Admin | Approve / deny / reset |

### Admin — Reviews
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/reviews` | Owner | All reviews with member names |
| PUT | `/api/admin/reviews/<id>/hide` | Admin | Toggle soft-hide |
| DELETE | `/api/admin/reviews/<id>` | Owner | Permanently delete |

### Admin — Users & Attendance
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | All members |
| DELETE | `/api/admin/users/<id>` | Admin | Delete member |
| PUT | `/api/admin/users/<id>/role` | Admin | Promote / demote admin |
| GET | `/api/admin/attendance` | Admin | All attendance records |
| GET | `/api/admin/meals/<id>/attendance-details` | Admin | Per-meal attendance detail |

### Admin — Analytics & Settings
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/analytics` | Admin | Summary stats, trends, top/bottom meals |
| GET | `/api/admin/settings` | Owner | Current access code |
| PUT | `/api/admin/settings/access-code` | Owner | Set or regenerate access code |

---

## Roles & Permissions

| Feature | Member | Admin | Owner |
|---|:---:|:---:|:---:|
| View meals, RSVP, late plates | ✅ | ✅ | ✅ |
| Submit / edit / delete own review | ✅ | ✅ | ✅ |
| View aggregate rating (3+ reviews) | ✅ | ✅ | ✅ |
| View all reviews with member names | — | — | ✅ |
| Soft-hide a review | — | ✅ | ✅ |
| Permanently delete any review | — | — | ✅ |
| Manage meals (create, edit, delete) | — | ✅ | ✅ |
| Approve / deny late plates | — | ✅ | ✅ |
| View attendance counts | — | ✅ | ✅ |
| Manage users / roles | — | ✅ | ✅ |
| View analytics dashboard | — | ✅ | ✅ |
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
pip install flask flask-sqlalchemy flask-migrate flask-bcrypt flask-cors pyjwt psycopg2-binary boto3

# Configure environment
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.

# Run migrations
flask db upgrade

# Create the first owner account
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
AWS_ACCESS_KEY_ID=           # required for S3 image uploads
AWS_SECRET_ACCESS_KEY=       # required for S3 image uploads
S3_BUCKET_NAME=              # required for S3 image uploads
```

### Frontend (`Frontend/.env`)

```env
VITE_API_URL=http://127.0.0.1:5001
```
