import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (
  email: string,
  code: string,
): Promise<void> => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "",
    to: email,
    subject: "Подтверждение email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Подтверждение регистрации</h2>
        <p>Ваш код подтверждения:</p>
        <h1 style="background-color: #f4f4f4; padding: 20px; text-align: center; letter-spacing: 5px;">
          ${code}
        </h1>
        <p>Код действителен в течение 15 минут.</p>
        <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
      </div>
    `,
  });
};
