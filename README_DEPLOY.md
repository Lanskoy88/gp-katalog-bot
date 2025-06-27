# 🚀 Быстрый деплой GP Katalog Bot

## ⚡ Самый простой способ - Railway

### 1. Подготовка
```bash
# Убедитесь что у вас есть:
# - Telegram Bot Token (от @BotFather)
# - MoySklad API Token
# - GitHub аккаунт
```

### 2. Создайте репозиторий на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gp-katalog-bot.git
git push -u origin main
```

### 3. Деплой на Railway
1. Зайдите на [Railway.app](https://railway.app/)
2. Нажмите "New Project" → "Deploy from GitHub repo"
3. Выберите ваш репозиторий
4. В настройках проекта добавьте переменные окружения:
   - `TELEGRAM_BOT_TOKEN` = ваш токен бота
   - `MOYSKLAD_API_TOKEN` = ваш токен MoySklad
   - `NODE_ENV` = production

### 4. Получите URL
После деплоя Railway даст вам URL вида:
`https://gp-katalog-bot-production-xxxx.up.railway.app`

### 5. Настройте webhook
```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-railway-url.com/webhook"}'
```

## ✅ Готово!

Ваш бот теперь работает 24/7 без localtunnel!

## 🔧 Альтернативные платформы

- **Render**: [render.com](https://render.com/)
- **Heroku**: [heroku.com](https://heroku.com/)
- **VPS**: DigitalOcean, Vultr, Linode

Подробные инструкции в файле `DEPLOY.md` 