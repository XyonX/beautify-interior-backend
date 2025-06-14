import nodemailer from "nodemailer";

const sendVerificationEmail = async (email, verificationToken) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verification link (point to your frontend route)
    const verificationLink = `${process.env.BASE_URL}/auth/verify-email?token=${verificationToken}`;

    // Email content
    const mailOptions = {
      from: `"Your E-commerce" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Email Verification",
      html: `
        <h2>Please verify your email</h2>
        <p>Click the link below to verify your account:</p>
        <a href="${verificationLink}">Verify Email</a>
        <p><b>This link expires in 24 hours</b></p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Email sending failed");
  }
};

export default sendVerificationEmail;
