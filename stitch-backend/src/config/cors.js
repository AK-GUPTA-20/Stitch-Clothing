const getCorsOptions = () => {
  const trustedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    
  ].filter(Boolean);

  return {
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header)
      if (!origin || trustedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS rejected origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
    optionsSuccessStatus: 200,
  };
};


module.exports = { getCorsOptions };
