import { resend } from "./mailer";

export const sendVerificationEmail = async (
  to: string,
  token: string,
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL;
  const from = process.env.MAIL_FROM;

  if (!frontendUrl || !from) {
    throw new Error("FRONTEND_URL and MAIL_FROM must be configured");
  }

  const link = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const { error } = await resend.emails.send({
    from,
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
        <p style="color:#666;font-size:13px;">
          This link expires in 30 minutes. If you did not create an account, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification email");
  }
};
