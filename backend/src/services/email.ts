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

export const sendEmailChangeVerification = async (
  email: string,
  code: string,
): Promise<void> => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "",
    to: email,
    subject: "Подтверждение смены email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Подтверждение смены email</h2>
        <p>Вы запросили смену email-адреса. Используйте код ниже для подтверждения нового адреса:</p>
        <h1 style="background-color: #f4f4f4; padding: 20px; text-align: center; letter-spacing: 5px;">
          ${code}
        </h1>
        <p>Код действителен в течение 15 минут.</p>
        <p>Если вы не запрашивали смену email, просто проигнорируйте это письмо.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  resetUrl: string,
): Promise<void> => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "",
    to: email,
    subject: "Восстановление пароля",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Восстановление пароля</h2>
        <p>Вы запросили восстановление пароля. Чтобы установить новый пароль, нажмите на кнопку ниже:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #1976d2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
            Сбросить пароль
          </a>
        </p>
        <p>Если кнопка не работает, скопируйте ссылку и откройте её в браузере:</p>
        <p style="word-break: break-all; color: #555555;">${resetUrl}</p>
        <p>Ссылка действительна в течение 15 минут и может быть использована только один раз.</p>
        <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо — ваш пароль останется прежним.</p>
      </div>
    `,
  });
};
