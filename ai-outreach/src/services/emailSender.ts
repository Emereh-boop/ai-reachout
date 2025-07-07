import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

export async function sendEmail({ to, subject, body, html }: { to: string; subject: string; body: string; html?: string }) {
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text: body,
      ...(html ? { html } : {})
    });
    return { status: 'sent' };
  } catch (error) {
    return { status: 'error', error };
  }
} 