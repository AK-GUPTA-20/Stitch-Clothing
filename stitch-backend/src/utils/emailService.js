const { Resend } = require("resend");

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_KEY);

/**
 * Sends an email
 */
const sendEmail = async (options) => {
  try {
    const fromAddress = `Stitch E-Commerce <noreply@mail.apiv1.tech>`;
    
    const data = await resend.emails.send({
      from: fromAddress,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });

    if (data.error) {
      console.error("Email sending failed:", data.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
};

/**
 * Sends an OTP verification email
 */
const sendVerificationOTP = async (email, otp) => {
  const subject = "Verify your Email Address";
  const message = `Your email verification code is: ${otp}\nThis code will expire in 15 minutes.`;
  
  // A simple HTML template
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Stitch!</h2>
      <p>Please use the following OTP to verify your email address. It expires in 15 minutes.</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  return await sendEmail({ email, subject, message, html });
};

/**
 * Sends a Password Reset OTP email
 */
const sendPasswordResetOTP = async (email, otp) => {
  const subject = "Reset your Password";
  const message = `Your password reset code is: ${otp}\nThis code will expire in 10 minutes.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Please use the following OTP to proceed. It expires in 10 minutes.</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>If you did not request this, please safely ignore this email.</p>
    </div>
  `;

  return await sendEmail({ email, subject, message, html });
};

module.exports = {
  sendEmail,
  sendVerificationOTP,
  sendPasswordResetOTP,
};
