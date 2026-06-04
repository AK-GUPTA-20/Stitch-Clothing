# Stitch E-Commerce Backend

This is the backend API for Stitch, an E-commerce platform, built with Node.js, Express, and MongoDB.

## Deployment on Render

This repository is ready to be deployed on [Render.com](https://render.com) as a Web Service.

### Setup Instructions
1. Create a new **Web Service** on Render and connect this GitHub repository.
2. Ensure the **Build Command** is `npm install` and the **Start Command** is `npm start`.
3. Add the following Environment Variables in the Render dashboard:

| Variable | Description |
|---|---|
| `PORT` | Set this to `8000` (or leave empty, Render assigns one) |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for generating JWT tokens |
| `JWT_EXPIRES_TIME` | E.g. `7d` |
| `COOKIE_EXPIRES_TIME` | E.g. `7` |
| `RESEND_KEY` | Your Resend API Key for emails |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit Public Key |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit Private Key |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL Endpoint |

## Directory Structure
```
stitch-backend/
├── src/
│   ├── app.js               # Express App Setup
│   ├── server.js            # Server Entry Point
│   ├── config/              # Database configurations
│   ├── controllers/         # API Route Handlers
│   ├── middleware/          # Express Middlewares (Auth, Error)
│   ├── models/              # Mongoose Schemas
│   ├── routes/              # API Routes
│   └── utils/               # Utilities (ImageKit, Emails, ErrorHandler)
├── package.json
└── .env (Excluded from source control)
```

## Running Locally
1. Run `npm install`
2. Create a `.env` file based on the required variables above.
3. Run `npm run dev` to start the server with Nodemon.
