import { transporter } from "./mailer";

export const sendVerificationEmail = async (to: string, token: string) => {
  const link = `${process.env.APP_URL}api/v1/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Verify your email address",
    text: `Welcome! Please verify your email by opening this link (valid for 30 minutes): ${link}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Welcome aboard 👋</h2>
        <p>Please confirm your email address to finish setting up your account.</p>
        <p>
          <a href="${link}"
             style="display:inline-block;padding:12px 20px;background:#d97706;color:#fff;text-decoration:none;border-radius:6px;">
            Verify email
          </a>
        </p>
        <p style="color:#666;font-size:13px;">This link expires in 30 minutes. If you did not create an account, you can ignore this email.</p>
      </div>
    `,
  });
};
