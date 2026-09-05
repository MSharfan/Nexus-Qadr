import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, html, text }) => {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER;

  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST is missing");
  }

  if (!process.env.SMTP_USER) {
    throw new Error("SMTP_USER is missing");
  }

  if (!process.env.SMTP_PASS) {
    throw new Error("SMTP_PASS is missing");
  }

  console.log("Sending email...");
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("EMAIL_FROM:", from);

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    console.log("EMAIL SENT:", info.messageId);

    return info;
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    throw error;
  }
};

export default sendEmail;