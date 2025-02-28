import dotenv from "dotenv/config";
import axios from "axios";

/**
 * Send email via Firebase Cloud Function
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text email content
 * @param {string} html - HTML email content
 * @returns {Promise<boolean>} Success status
 */
export const sendMail = async (to, subject, text, html) => {
  if (!to || !subject) {
    console.error("Missing required email parameters");
    return false;
  }

  try {
    const emailEndpoint = process.env.FIREBASE_EMAIL_ENDPOINT;
    const senderEmail = process.env.DEFAULT_SENDER_EMAIL;

    if (!emailEndpoint || !senderEmail) {
      console.error("Missing email configuration in environment variables");
      return false;
    }

    const response = await axios.post(
      emailEndpoint,
      {
        from: senderEmail,
        to: to,
        subject: subject,
        text: text || "",
        html: html || "",
      }
    );

    console.info(`Firebase email sent to ${to.substring(0, 3)}***`);
    return true;
  } catch (error) {
    console.error("Error sending email through Firebase:", error.message);
    return false;
  }
};

/**
 * Send an email with code snippets via Firebase
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const sendMailWithAttachment = async (req, res) => {
  try {
    const { to, subject, nodeCode, phpCode, apiKey } = req.body;

    if (!to) {
      return res.status(400).json({
        status: "error",
        message: "Recipient email is required",
      });
    }

    // Move this HTML template to a separate template file in production
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Code Snippets</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 5px; }
        .code-block { background: #f1f1f1; padding: 15px; border-radius: 4px; margin: 15px 0; position: relative; }
        pre { white-space: pre-wrap; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Your requested code snippets</h2>
        ${nodeCode ? `
          <div class="code-block">
            <h3>Node.js</h3>
            <pre>${nodeCode}</pre>
          </div>
        ` : ''}
        ${phpCode ? `
          <div class="code-block">
            <h3>PHP</h3>
            <pre>${phpCode}</pre>
          </div>
        ` : ''}
        ${apiKey ? `
          <div class="code-block">
            <h3>API Key</h3>
            <pre>${apiKey}</pre>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
    `;

    const emailEndpoint = process.env.FIREBASE_EMAIL_ENDPOINT;
    const senderEmail = process.env.DEFAULT_SENDER_EMAIL;

    if (!emailEndpoint || !senderEmail) {
      return res.status(500).json({
        status: "error",
        message: "Email service not properly configured",
      });
    }

    const response = await axios.post(
      emailEndpoint,
      {
        from: senderEmail,
        to: to,
        subject: subject || "Your Code Snippets",
        text: "Your requested code snippets are attached in HTML format.",
        html: htmlContent,
      }
    );

    res.status(200).json({
      status: "success",
      message: "Email sent successfully!",
    });
  } catch (error) {
    console.error("Error sending email with attachment:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to send email",
    });
  }
};
