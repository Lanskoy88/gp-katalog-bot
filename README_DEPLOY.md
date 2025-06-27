# 🚀 Деплой GP Katalog Bot на Railway

## 📋 Подготовка к деплою

### 1. Убедитесь, что у вас есть:
- ✅ Telegram Bot Token (от @BotFather)
- ✅ MoySklad API Token
- ✅ GitHub аккаунт
- ✅ Аккаунт на Railway.app

### 2. Проверьте, что код загружен в GitHub
```bash
git status
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

## 🚀 Деплой на Railway

### Шаг 1: Создайте проект на Railway
1. Зайдите на [Railway.app](https://railway.app/)
2. Нажмите **"New Project"**
3. Выберите **"Deploy from GitHub repo"**
4. Найдите и выберите ваш репозиторий: **`Lanskoy88/gp-katalog-bot`**

### Шаг 2: Настройте переменные окружения
После создания проекта, в настройках проекта добавьте переменные окружения:

**Variables:**
- `TELEGRAM_BOT_TOKEN` = ваш токен бота от @BotFather
- `MOYSKLAD_API_TOKEN` = ваш токен MoySklad
- `NODE_ENV` = production

### Шаг 3: Дождитесь деплоя
Railway автоматически:
- Установит зависимости
- Соберет React приложение
- Запустит сервер

### Шаг 4: Получите URL
После успешного деплоя Railway даст вам URL вида:
`https://gp-katalog-bot-production-xxxx.up.railway.app`

## 🔧 Настройка Telegram Bot

### 1. Настройте Webhook (опционально)
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-railway-url.railway.app/webhook"}'
```

### 2. Создайте Mini App
1. Напишите @BotFather команду `/newapp`
2. Выберите вашего бота
3. Введите название мини-приложения
4. Загрузите иконку (512x512px)
5. Введите описание
6. Укажите URL: `https://your-railway-url.railway.app`

## 📊 Проверка работы

### 1. Проверьте API
```bash
curl https://your-railway-url.railway.app/health
curl https://your-railway-url.railway.app/api/products
```

### 2. Проверьте бота
Отправьте боту команду `/start`

### 3. Проверьте Mini App
Откройте Mini App в Telegram

## 🔍 Логи и мониторинг

### Просмотр логов
1. В Railway Dashboard выберите ваш проект
2. Перейдите на вкладку "Deployments"
3. Нажмите на последний деплой
4. Просмотрите логи

### Мониторинг
Railway автоматически отслеживает:
- Статус приложения
- Использование ресурсов
- Ошибки

## 🛠️ Устранение неполадок

### Проблема: Приложение не запускается
**Решение:**
1. Проверьте логи в Railway Dashboard
2. Убедитесь, что все переменные окружения настроены
3. Проверьте, что токены действительны

### Проблема: API возвращает ошибки
**Решение:**
1. Проверьте MoySklad токен
2. Убедитесь, что у токена есть права на чтение товаров
3. Проверьте логи сервера

### Проблема: Mini App не загружается
**Решение:**
1. Проверьте CORS настройки
2. Убедитесь, что URL правильный
3. Проверьте, что React приложение собрано

## 📞 Поддержка

Если у вас возникли проблемы:
1. Проверьте логи в Railway Dashboard
2. Убедитесь, что все переменные окружения настроены правильно
3. Проверьте документацию Railway: https://docs.railway.app/ 