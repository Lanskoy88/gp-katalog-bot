# Деплой на Render

## Обзор
Render - это современная облачная платформа для деплоя приложений. Она предлагает бесплатный план с автоматическим деплоем из GitHub.

## Преимущества Render
- ✅ Бесплатный план
- ✅ Автоматический деплой из GitHub
- ✅ Простая настройка
- ✅ SSL сертификаты включены
- ✅ Глобальный CDN
- ✅ Автоматические обновления

## Подготовка к деплою

### 1. Убедитесь, что код загружен в GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Проверьте файлы конфигурации
Убедитесь, что у вас есть следующие файлы:
- `render.yaml` - конфигурация Render
- `package.json` - с правильными скриптами
- `Procfile` - для запуска приложения
- `.env` файл с переменными окружения

## Пошаговый деплой

### Шаг 1: Регистрация на Render
1. Перейдите на [render.com](https://render.com)
2. Зарегистрируйтесь через GitHub
3. Подтвердите email

### Шаг 2: Создание нового Web Service
1. В Dashboard нажмите "New +"
2. Выберите "Web Service"
3. Подключите ваш GitHub репозиторий

### Шаг 3: Настройка сервиса
1. **Name**: `gp-katalog-bot`
2. **Environment**: `Node`
3. **Region**: Выберите ближайший к вам
4. **Branch**: `main`
5. **Build Command**: `npm run install-all && npm run build`
6. **Start Command**: `npm start`

### Шаг 4: Настройка переменных окружения
В разделе "Environment Variables" добавьте:

```
NODE_ENV=production
PORT=10000
TELEGRAM_BOT_TOKEN=ваш_токен_бота
MOYSKLAD_API_TOKEN=ваш_токен_moysklad
MOYSKLAD_ACCOUNT_ID=ваш_account_id
WEBHOOK_URL=https://ваш-домен.onrender.com/webhook
```

### Шаг 5: Настройка автоматического деплоя
- ✅ **Auto-Deploy**: Включено
- ✅ **Deploy on Push**: Включено

### Шаг 6: Запуск деплоя
1. Нажмите "Create Web Service"
2. Render автоматически начнет деплой
3. Дождитесь завершения (обычно 5-10 минут)

## Проверка деплоя

### 1. Проверка health check
```
https://ваш-домен.onrender.com/health
```
Должен вернуть: `{"status":"OK","timestamp":"..."}`

### 2. Проверка API
```
https://ваш-домен.onrender.com/api/products
```

### 3. Проверка Telegram бота
1. Отправьте команду `/start` боту
2. Проверьте, что бот отвечает

## Настройка Telegram Webhook

После успешного деплоя настройте webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://ваш-домен.onrender.com/webhook"}'
```

## Мониторинг и логи

### Просмотр логов
1. В Dashboard Render перейдите к вашему сервису
2. Вкладка "Logs" покажет все логи приложения

### Мониторинг
- **Uptime**: Render автоматически мониторит доступность
- **Performance**: Метрики в реальном времени
- **Errors**: Автоматическое уведомление об ошибках

## Обновление приложения

### Автоматическое обновление
1. Внесите изменения в код
2. Запушьте в GitHub
3. Render автоматически пересоберет и перезапустит приложение

### Ручное обновление
1. В Dashboard нажмите "Manual Deploy"
2. Выберите ветку для деплоя

## Troubleshooting

### Проблема: Build failed
**Решение**: Проверьте логи сборки в Render Dashboard

### Проблема: App crashes on startup
**Решение**: 
1. Проверьте переменные окружения
2. Убедитесь, что все зависимости установлены
3. Проверьте логи приложения

### Проблема: Telegram bot не отвечает
**Решение**:
1. Проверьте TELEGRAM_BOT_TOKEN
2. Убедитесь, что webhook настроен правильно
3. Проверьте логи бота

### Проблема: MoySklad API ошибки
**Решение**:
1. Проверьте MOYSKLAD_API_TOKEN
2. Проверьте MOYSKLAD_ACCOUNT_ID
3. Убедитесь, что токен не истек

## Стоимость

### Бесплатный план
- ✅ 750 часов в месяц
- ✅ 512 MB RAM
- ✅ Shared CPU
- ✅ Автоматический sleep после 15 минут неактивности

### Платные планы
- **Starter**: $7/месяц
- **Standard**: $25/месяц
- **Pro**: $85/месяц

## Альтернативы

Если Render не подходит, рассмотрите:
- **Heroku** - классический выбор
- **Vercel** - быстрый деплой
- **DigitalOcean App Platform** - надежность
- **Railway** - простота настройки

## Полезные ссылки

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Health Checks](https://render.com/docs/health-checks) 