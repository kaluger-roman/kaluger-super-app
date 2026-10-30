export const DENIED_TEXT =
  "Уведомления запрещены в настройках браузера или телефона. Чтобы разрешить:";
// The installed app's name as iOS lists it: short_name in public/manifest.json and
// apple-mobile-web-app-title in public/index.html (renaming it is issue #122).
const INSTALLED_APP_NAME = "Репетитор";

export const DENIED_STEPS = [
  "Android — Настройки сайта → Уведомления",
  `iPhone — Настройки → Уведомления → ${INSTALLED_APP_NAME}`,
  "Компьютер — значок замка в адресной строке → Уведомления",
];
