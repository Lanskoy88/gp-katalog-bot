# 🚀 Быстрый запуск на Render

## Шаги для развертывания:

### 1. Подключение к Render
- Перейдите на [render.com](https://render.com)
- Нажмите "New +" → "Web Service"
- Подключите репозиторий: `https://github.com/Lanskoy88/gp-katalog-bot`

### 2. Настройка сервиса
```
Name: gp-katalog-bot
Environment: Node
Branch: main
Build Command: npm run install-all
Start Command: npm start
```

### 3. Переменные окружения
Добавьте в Environment Variables:

```
NODE_ENV=production
TELEGRAM_BOT_TOKEN=7207292392:AAEfMX6zpgf-pXUfyeLYe_xhXw439CL6POs
MOYSKLAD_API_TOKEN=876311c15447994f9f5d11e90112c482026fd6bb
MOYSKLAD_ACCOUNT_ID=7d408f60-5980-11e9-9109-f8fc0000577b
BASE_URL=https://gp-katalog-bot.onrender.com
ADMIN_IDS=123456789,987654321
ALLOWED_ORIGINS=https://web.telegram.org
```

### 4. Настройка Web App URL
После развертывания в BotFather:
```
/setmenubutton
Выберите бота
URL: https://gp-katalog-bot.onrender.com/catalog
```

### 5. Проверка
- Откройте: `https://gp-katalog-bot.onrender.com/health`
- Должен вернуться: `{"status":"OK"}`

### 6. Тестирование
- Найдите бота в Telegram
- Отправьте `/start`
- Нажмите "Открыть каталог"

## ⚡ Команды для проверки:

```bash
# Проверка конфигурации
npm run check-render

# Проверка локальной работы
npm run check-config

# Тестирование Telegram API
npm run test-telegram
```

## 📞 Поддержка:
- Логи: Render Dashboard → Logs
- Health Check: `/health`
- Подробная инструкция: `RENDER_SETUP.md`

## 🎯 URL мини-приложения:
`https://gp-katalog-bot.onrender.com` 