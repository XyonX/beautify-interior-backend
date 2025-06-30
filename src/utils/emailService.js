import nodemailer from "nodemailer";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
// index.js (or server.js, app.js, etc.)
import dotenv from "dotenv";
dotenv.config();

// Add this at the top of your file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// // Create the Nodemailer transporter once for reuse
// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: process.env.EMAIL_PORT,
//   secure: true, // Must be true for port 465
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true, // Must be true for port 465
  auth: {
    user: process.env.EMAIL_USER, // Must be full email address
    pass: process.env.EMAIL_PASSWORD, // Use the email account password
  },
  tls: {
    rejectUnauthorized: false, // Add this for Hostinger
  },
});

// Function to render a template with data
const renderTemplate = (templateName, data) => {
  const templatePath = path.join(
    __dirname,
    `../templates/emails/${templateName}.hbs`
  );
  const templateSource = fs.readFileSync(templatePath, "utf8");
  const template = handlebars.compile(templateSource);
  return template(data);
};

// Generic function to send any type of email
export const sendEmail = async (to, subject, templateName, data, from) => {
  try {
    const html = renderTemplate(templateName, data);
    const mailOptions = {
      from: from, // Dynamic "From" address
      to: to,
      subject: subject,
      html: html,
    };
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to} from ${from}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email sending failed");
  }
};

export const sendVerificationEmail = async (
  email,
  userName,
  verificationToken
) => {
  const verificationLink = `${process.env.BASE_URL}/auth/verify-email?token=${verificationToken}`;
  const from = `"Beautify Interior" <noreply@beautifyinterior.com>`;
  const data = { userName, verificationLink };
  await sendEmail(email, "Email Verification", "verification", data, from);
};

// Example: Specific function for welcome email
export const sendWelcomeEmail = async (email, userName) => {
  const shopLink = `${process.env.FRONTEND_URL}`;
  const data = { userName,shopLink };

  const from = `"Beautify Interior" <noreply@beautifyinterior.com>`;
  await sendEmail(email, "Welcome to Beautify Interior", "welcome", data, from);

};

export default sendVerificationEmail;
