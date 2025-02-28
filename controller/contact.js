import Email from "../models/emailModel.js";
import { sendMail } from "../utils/mailer.js";

/**
 * Store email from contact form and notify owner
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const storeEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Input validation
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({
        status: "error",
        message: "Valid email is required"
      });
    }

    // Check for existing email
    const emailExists = await Email.findOne({ email: email.toLowerCase().trim() });
    if (!emailExists) {
      const newEmail = new Email({ email: email.toLowerCase().trim() });
      await newEmail.save();
    }

    // Send notification to owner
    const to = process.env.OWNER_EMAIL;
    const subject = "New Contact";
    const text = `New Contact: 📨 ${email}`;
    const html = `<p>New contact submission received from: <strong>${email}</strong></p>`;

    try {
      await sendMail(to, subject, text, html);
    } catch (emailError) {
      console.error("Error sending notification email:", emailError.message);
      // Continue execution - we still want to save the contact even if notification fails
    }

    res.status(201).json({
      status: "success",
      message: "Email stored successfully"
    });
  } catch (error) {
    console.error("Error storing email:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to process contact request"
    });
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
