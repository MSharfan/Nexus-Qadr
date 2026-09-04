import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) throw new Error("Email transporter not configured");

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";

  await transporter.sendMail({ from, to, subject, html, text });
};

export default sendEmail;
