const requiredEnvVars = {
  MONGO_URI: "MongoDB connection string",
  
  JWT_SECRET_KEY: "JWT secret for token generation",
  JWT_EXPIRE: "JWT token expiration time",
  JWT_REFRESH_SECRET: "JWT refresh token secret",
  JWT_REFRESH_EXPIRE: "JWT refresh token expiration time",
  
  PORT: "Server port",
  NODE_ENV: "Environment (development/production)",
  FRONTEND_URL: "Frontend application URL",
  
  EMAIL_SERVICE: "Email service (nodemailer/resend)",
  GMAIL_USER: "Gmail user email",
  GMAIL_PASS: "Gmail app password",
  
  IMAGEKIT_PUBLIC_KEY: "ImageKit public key",
  IMAGEKIT_PRIVATE_KEY: "ImageKit private key",
  IMAGEKIT_URL_ENDPOINT: "ImageKit URL endpoint",
  
};


const validateEnvironment = () => {
  const missingVars = [];

  Object.keys(requiredEnvVars).forEach((key) => {
    const optionalVars = [
      "REDIS_URL",
      "EMAIL_SERVICE", "GMAIL_USER", "GMAIL_PASS",
      "IMAGEKIT_PUBLIC_KEY", "IMAGEKIT_PRIVATE_KEY", "IMAGEKIT_URL_ENDPOINT"
    ];   
    if (optionalVars.includes(key)) {
      return; 
    }

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