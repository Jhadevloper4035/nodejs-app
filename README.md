# 🔐 Authentication System - Development Ready

Simple, clean JWT authentication system with email verification and password reset.

## ✨ Features

- ✅ User registration with email verification
- ✅ Login with JWT tokens (access + refresh)
- ✅ Token refresh & rotation
- ✅ Logout (single device or all devices)
- ✅ Password reset with OTP
- ✅ Email verification with OTP
- ✅ Rate limiting
- ✅ Security headers
- ✅ Hot reload for development

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start with Docker (recommended)
docker-compose up -d

# View logs
docker-compose logs -f app
```

Visit: `http://localhost:3000`

## 📦 Tech Stack

- Node.js + Express
- MongoDB (database)
- Redis (token blacklist)
- RabbitMQ (email queue)
- EJS (templates)
- Docker

## 🔧 Development

### With Docker (Hot Reload Enabled)

```bash
# Start
docker-compose up -d

# Watch logs
docker-compose logs -f app

# Stop
docker-compose down

# Edit code - it auto-restarts!
```

### Without Docker

```bash
# Start MongoDB, Redis, RabbitMQ locally
# Update .env with local URLs

# Run app
npm start

# Run worker (separate terminal)
npm run worker
```

## 📝 API Endpoints

### Authentication
- `GET /register` - Registration page
- `POST /register` - Create account
- `GET /login` - Login page
- `POST /login` - Authenticate
- `POST /logout` - Logout
- `POST /logout-all` - Logout all devices
- `POST /refresh` - Refresh token

### Email Verification
- `GET /verify-email` - Verification page
- `POST /verify-email` - Verify OTP
- `POST /send-verify-otp` - Resend OTP

### Password Reset
- `GET /forgot-password` - Forgot password page
- `POST /forgot-password` - Request reset OTP
- `GET /reset-password` - Reset page
- `POST /reset-password` - Reset password

### Pages
- `GET /` - Home page
- `GET /dashboard` - User dashboard (protected)

## 🛡️ Security Features

- JWT authentication with token rotation
- Refresh token blacklist (Redis)
- OTP email verification (bcrypt hashed)
- Password reset with OTP
- Rate limiting on auth endpoints
- Helmet.js security headers
- CORS protection
- Input validation
- Account enumeration prevention

## 📊 Console Logs

Simple, clean logs for development:

```
✅ MongoDB connected: mongodb/secureEJS
✅ Redis connected
✅ RabbitMQ connected: email_queue
✅ User registered: user@example.com
✅ User logged in: user@example.com
✅ Email verified: user@example.com
✅ User logged out
```

Errors show clearly:
```
❌ Auth failed: Token expired
❌ Login failed: Invalid credentials
```

## 🔄 Hot Reload

Code changes are automatically detected:
```
[nodemon] restarting due to changes...
[nodemon] starting `node src/server.js`
✅ MongoDB connected
✅ Redis connected
✅ Server running on port 3000
```

## 📁 Project Structure

```
src/
├── config/          # Database, Redis, RabbitMQ
├── controllers/     # Request handlers
├── middlewares/     # Auth, security, rate limiting
├── models/          # User model
├── routes/          # Express routes
├── services/        # Token blacklist, email queue
├── utils/           # JWT, crypto, validation
├── views/           # EJS templates
├── worker/          # Email worker
├── app.js          # Express setup
└── server.js       # Server entry
```

## 🧪 Testing

1. Start the app: `docker-compose up -d`
2. Register a new user
3. Check console for OTP (if SMTP not configured)
4. Verify email with OTP
5. Login
6. Access dashboard
7. Test logout
8. Test password reset

## 🔒 Production Checklist

Before deploying:
- [ ] Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_SECURE=true`
- [ ] Configure real SMTP settings
- [ ] Update MongoDB credentials
- [ ] Set up SSL/TLS
- [ ] Configure firewall
- [ ] Enable monitoring

## 📄 License

MIT

---

**Simple. Clean. Ready for development.** 🚀
