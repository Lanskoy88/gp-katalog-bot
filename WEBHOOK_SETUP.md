# 🔧 Настройка вебхуков для Telegram бота

## 📋 Что такое вебхуки?

Вебхуки - это способ получения обновлений от Telegram API через HTTP запросы вместо постоянного опроса сервера. Это более эффективно для продакшена.

## 🚀 Преимущества вебхуков:

- ✅ **Быстрее** - мгновенное получение сообщений
- ✅ **Эффективнее** - меньше нагрузки на сервер
- ✅ **Надежнее** - нет проблем с таймаутами
- ✅ **Масштабируемо** - лучше для высоких нагрузок

## 🔧 Настройка вебхуков

### 1. Автоматическая настройка (рекомендуется)

```bash
# Установить вебхук для продакшена
npm run setup-webhook setup

# Проверить статус вебхука
npm run setup-webhook info

# Удалить вебхук (вернуться к polling)
npm run setup-webhook remove
```

### 2. Ручная настройка

```bash
# Установить вебхук
node setup-webhook.js setup

# Проверить информацию
node setup-webhook.js info

# Удалить вебхук
node setup-webhook.js remove
```

## 🌍 Режимы работы

### Разработка (локально)
- **Режим**: Polling
- **Конфигурация**: `USE_WEBHOOK=false` или не установлено
- **Преимущества**: Простота отладки, не требует HTTPS

### Продакшен (Render)
- **Режим**: Webhook
- **Конфигурация**: `USE_WEBHOOK=true`
- **URL**: `https://gp-katalog-bot.onrender.com/webhook`

## ⚙️ Переменные окружения

```env
# Основные настройки
NODE_ENV=production
BASE_URL=https://gp-katalog-bot.onrender.com
USE_WEBHOOK=true

# Токены
TELEGRAM_BOT_TOKEN=your_bot_token
MOYSKLAD_API_TOKEN=your_moysklad_token
```

## 🔍 Мониторинг вебхуков

### Проверка статуса
```bash
curl -s "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
```

### Health check
```bash
curl https://gp-katalog-bot.onrender.com/health
```

## 🛠️ Устранение неполадок

### Проблема: Вебхук не работает
**Решение:**
1. Проверьте URL: `https://gp-katalog-bot.onrender.com/webhook`
2. Убедитесь, что сервер запущен
3. Проверьте логи на Render

### Проблема: Сообщения не приходят
**Решение:**
1. Проверьте статус вебхука: `npm run setup-webhook info`
2. Убедитесь, что `USE_WEBHOOK=true` в продакшене
3. Проверьте переменные окружения на Render

### Проблема: Ошибки 404/500
**Решение:**
1. Проверьте, что сервер развернут на Render
2. Убедитесь, что endpoint `/webhook` доступен
3. Проверьте логи сервера

## 📊 Статусы вебхука

- **URL установлен**: ✅ Вебхук активен
- **URL пустой**: ❌ Вебхук не настроен
- **Ожидающие обновления**: Количество необработанных сообщений

## 🔄 Переключение режимов

### С polling на webhook
```bash
# 1. Установить переменную окружения
USE_WEBHOOK=true

# 2. Перезапустить сервер
# 3. Настроить вебхук
npm run setup-webhook setup
```

### С webhook на polling
```bash
# 1. Удалить вебхук
npm run setup-webhook remove

# 2. Установить переменную окружения
USE_WEBHOOK=false

# 3. Перезапустить сервер
```

## 📝 Логи и отладка

### Логи сервера
```bash
# Локально
npm run dev

# На Render
# Проверьте логи в панели управления Render
```

### Логи вебхука
```bash
# Проверка входящих запросов
curl -X POST https://gp-katalog-bot.onrender.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 🎯 Лучшие практики

1. **Всегда проверяйте статус** вебхука после развертывания
2. **Используйте health check** для мониторинга
3. **Логируйте ошибки** для отладки
4. **Тестируйте локально** перед развертыванием
5. **Резервный план** - возможность переключения на polling

## 🔗 Полезные ссылки

- [Telegram Bot API - Webhooks](https://core.telegram.org/bots/api#setwebhook)
- [Render Documentation](https://render.com/docs)
- [Node Telegram Bot API](https://github.com/yagop/node-telegram-bot-api) 