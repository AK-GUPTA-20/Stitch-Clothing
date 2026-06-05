const requiredEnvVars = {
  MONGO_URI: "MongoDB connection string",
  
  JWT_SECRET_KEY: "JWT secret for token generation",
  JWT_EXPIRE: "JWT token expiration time",
  JWT_REFRESH_SECRET: "JWT refresh token secret",
  JWT_REFRESH_EXPIRE: "JWT refresh token expiration time",
  
  PORT: "Server port",
  NODE_ENV: "Environment (development/production)",
  FRONTEND_URL: "Frontend application URL",
  RESEND_KEY: "Resend API key for emails"
};

const validateEnvironment = () => {
  const missingVars = [];

  Object.keys(requiredEnvVars).forEach((key) => {
    if (!process.env[key]) {
      missingVars.push(`${key} - ${requiredEnvVars[key]}`);
    }
  });

  if (missingVars.length > 0) {
    console.error("\n MISSING ENVIRONMENT VARIABLES:\n");
    missingVars.forEach((v) => console.error(`   - ${v}`));
    console.error(
      "\n📝 Please set these variables in your .env file\n"
    );
    
    throw new Error(`Missing ${missingVars.length} required environment variables`);
  }

};

module.exports = {
  validateEnvironment
};