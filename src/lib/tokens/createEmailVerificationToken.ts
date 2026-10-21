import crypto from 'crypto';

export const createEmailVerificationToken = async () => {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex")

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return { verificationToken, verificationTokenHash, expiresAt}
}