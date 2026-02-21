// PM2 ecosystem config — используется на VPS
// Установка: npm install -g pm2
// Запуск: pm2 start ecosystem.config.js
// Автозапуск: pm2 startup && pm2 save
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/index.js',
      cwd: '/home/roman-kaluger/kaluger-super-app/backend',
      node_args: '--max-old-space-size=256',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
