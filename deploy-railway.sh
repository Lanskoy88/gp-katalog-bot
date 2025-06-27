#!/bin/bash

echo "🚀 Начинаем деплой GP Katalog Bot на Railway..."

# Проверяем наличие Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не установлен. Устанавливаем..."
    npm install -g @railway/cli
fi

# Проверяем авторизацию
if ! railway whoami &> /dev/null; then
    echo "🔐 Авторизуемся в Railway..."
    railway login
fi

# Создаем новый проект если его нет
if [ ! -f .railway/project.json ]; then
    echo "📁 Создаем новый проект Railway..."
    railway init
fi

# Собираем проект
echo "🔨 Собираем проект..."
npm run install-all
npm run build

# Деплой
echo "🚀 Деплоим на Railway..."
railway up

echo "✅ Деплой завершен!"
echo "🌐 URL вашего бота будет показан выше"
echo "📝 Не забудьте настроить переменные окружения в Railway Dashboard:"
echo "   - TELEGRAM_BOT_TOKEN"
echo "   - MOYSKLAD_API_TOKEN"
echo "   - NODE_ENV=production" 