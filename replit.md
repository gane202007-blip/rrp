# PlastiCore AI

## Overview
PlastiCore AI is a Plastic Waste Reuse System. It classifies plastic waste (PET, HDPE, PVC, LDPE, PP, PS) using AI and maps classifications to construction material applications (bricks, roads, insulation, etc.). The system tracks environmental impact (CO₂/energy/water savings) and allows users to generate PDF reports.

## Architecture

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript, Chart.js for charts, jsPDF for PDF exports
- **Backend**: Node.js + Express.js (serves both API and static frontend)
- **Database**: MongoDB via Mongoose (uses `mongodb-memory-server` for in-memory development DB)
- **Auth**: JWT (JSON Web Tokens) with bcryptjs for password hashing, role-based access (user/admin)
- **AI**: Anthropic Claude Vision API (with smart mock fallback if no API key)

### Project Structure
```
├── public/              # Frontend static assets
│   ├── index.html       # Landing/main page
│   ├── login.html       # Login page
│   ├── register.html    # Registration page
│   ├── dashboard.html   # User/Admin dashboard
│   ├── app.js           # Core frontend logic (AI analysis, charts, PDF)
│   ├── auth.js          # Frontend authentication handling
│   ├── dashboard.js     # Dashboard-specific logic
│   └── style.css        # Global styles
└── server/              # Backend
    ├── server.js         # Express entry point (starts in-memory MongoDB if needed)
    ├── config/db.js      # MongoDB connection via Mongoose
    ├── middleware/
    │   ├── auth.js       # JWT authentication middleware
    │   └── role.js       # Role-based access control
    ├── models/
    │   ├── User.js       # Mongoose User schema
    │   └── Upload.js     # Mongoose Upload/Analysis schema
    └── routes/
        ├── authRoutes.js  # /api/auth/* (register, login, me)
        ├── userRoutes.js  # /api/user/* (user uploads)
        └── adminRoutes.js # /api/admin/* (admin controls)
```

## Configuration

### Environment Variables (set in Replit Secrets)
- `JWT_SECRET` - Secret for signing JWTs (auto-generated on setup)
- `ADMIN_SECRET_KEY` - Secret key required for admin registration
- `MONGO_URI` - MongoDB connection string (set to `USE_MEMORY_SERVER` for in-memory dev DB)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

### In-Memory MongoDB
The server uses `mongodb-memory-server` when `MONGO_URI` is `USE_MEMORY_SERVER` or unset. This means data resets on each server restart. For production use, provide a real `MONGO_URI` (e.g., MongoDB Atlas).

## Running the App
- **Workflow**: "Start application" runs `node server/server.js` on port 5000
- **Dev command**: `npm run dev` or `npm start`
- The Express server serves both the API (`/api/*`) and the static frontend

## API Endpoints
- `GET /api/health` - Health check
- `POST /api/auth/register` - Register user (requires `ADMIN_SECRET_KEY` for admin role)
- `POST /api/auth/login` - Login, returns JWT
- `GET /api/auth/me` - Get current user info
- `GET /api/user/uploads` - Get user's analysis history
- `GET /api/admin/uploads` - Admin: get all uploads
- `GET /api/admin/users` - Admin: get all users
