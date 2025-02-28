import nodemailer from "nodemailer";
import dotenv from "dotenv/config";

// Create transporter only when needed (lazy initialization)
const createTransporter = () => {
  const configOptions = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  };

  return nodemailer.createTransport(configOptions);
};

/**
 * Send an email using configured SMTP settings
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text version of email
 * @param {string} html - HTML version of email
 * @returns {Promise<boolean>} Success status
 */
export const sendMail = async (to, subject, text, html) => {
  if (!to || !subject) {
    console.error("Missing required email parameters");
    return false;
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || 'M2M Beta'}" <${process.env.MAIL_USER}>`,
      to: to,
      subject: subject,
      text: text || "",
      html: html || "",
    });

    console.info(`Email sent to ${to.substring(0, 3)}***: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};
