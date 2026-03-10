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

## Backend APIs

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/categories`
- `GET /api/symptoms`
- `GET /api/doctors`
- `GET /api/doctors/:id`
- `GET /api/favorites`
- `POST /api/favorites/:doctorId` (toggle)
- `GET /api/appointments`
- `POST /api/appointments`
- `PATCH /api/appointments/:id`
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
