# Doctor Appointment Booking App (Frontend + Backend)

This project includes a full doctor appointment booking flow with a built-in Node.js backend and a responsive frontend inspired by your provided UI.

## Features

- Login flow (`mary@example.com` / `password123`)
- Doctor discovery with search, categories, and symptoms
- Specialist listing screen
- Doctor details + appointment booking
- Favorites management
- Appointments management
- Status tabs (`scheduled`, `completed`, `cancelled`)
- Cancel, complete, and reschedule actions
- Chat list and per-doctor messaging thread
- Side drawer and bottom navigation
- Thank-you confirmation screen after booking
- Responsive layout for desktop web and mobile browsers
- PWA support (installable on mobile/desktop with offline app shell cache)
- Smart appointment recommendations by symptom/date/time
- Smart auto-booking (best doctor + nearest open slot)
- Doctor day schedule management with date-based available slots

## Backend APIs

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/categories`
- `GET /api/symptoms`
- `GET /api/doctors`
- `GET /api/doctors/:id`
- `GET /api/doctors/:id/schedule?date=YYYY-MM-DD`
- `PUT /api/doctors/:id/schedule`
- `GET /api/favorites`
- `POST /api/favorites/:doctorId` (toggle)
- `GET /api/appointments`
- `POST /api/appointments`
- `POST /api/appointments/smart-book`
- `PATCH /api/appointments/:id`
- `GET /api/smart-appointments/recommendations`
- `GET /api/chats`
- `GET /api/chats/:doctorId/messages`
- `POST /api/chats/:doctorId/messages`

Data persists in `data/store.json`.

## Run

1. Install Node.js 18+.
2. In project root:

```bash
npm start
```

3. Open:

```text
http://localhost:3000
```

## Deploy Frontend On Render

Use a **Static Site** service in Render:

1. New `Static Site` -> connect this GitHub repo.
2. Branch: `main`
3. Build command: leave empty
4. Publish directory: `public`
5. Deploy

Frontend API target is controlled in [public/config.js](/Users/maryalexissolis/Documents/doctor-appointment/public/config.js).
Current value points to:

`https://doctor-appointment-api-esie.onrender.com`

If backend URL changes, update `public/config.js` and redeploy.

## Native iOS (SwiftUI)

Native iOS project path:

`DoctorAppointmentiOS/DoctorAppointmentiOS.xcodeproj`

Run backend first:

```bash
npm start
```

Then open/build iOS app:

```bash
xcodebuild -project DoctorAppointmentiOS/DoctorAppointmentiOS.xcodeproj -scheme DoctorAppointmentiOS -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/DoctorAppointmentDerivedData build
```

In Xcode, run `DoctorAppointmentiOS` on an iPhone simulator.

iOS API base URL defaults to your Render deployment:

`https://doctor-appointment-api-esie.onrender.com`

To run iOS against local backend instead, set scheme environment variable:

`API_BASE_URL=http://127.0.0.1:3000`

Note: Render URL serves the web UI from this repo. Native iOS UI is separate in the Xcode project, so visual differences between web and iOS are expected.

## Notes

- The app is dependency-light and uses only Node built-ins.
- If you want this converted to React + Express + database auth (JWT, Postgres, etc.), it can be done on top of this baseline.
