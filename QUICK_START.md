# 🚀 Быстрый старт Telegram бота каталога

## 📋 Предварительные требования

- Node.js 18+
- Telegram Bot Token (получите у @BotFather)
- МойСклад API Token

## ⚡ Быстрый запуск

### 1. Клонирование и установка
```bash
git clone <your-repo-url>
cd gp-katalog-bot
npm run install-all
```

### 2. Настройка переменных окружения
Создайте файл `.env`:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
MOYSKLAD_API_TOKEN=your_moysklad_api_token
NODE_ENV=development
```

### 3. Проверка конфигурации
```bash
npm run check-config
```

### 4. Тестирование Telegram API
```bash
npm run test-telegram
```

### 5. Настройка HTTPS туннеля (для разработки)
```bash
npm run setup-tunnel
```

### 6. Запуск сервера
```bash
npm start
```

## 🔧 Основные команды

| Команда | Описание |
|---------|----------|
| `npm start` | Запуск сервера |
| `npm run dev` | Запуск в режиме разработки |
| `npm run build` | Сборка клиента |
| `npm run check-config` | Проверка конфигурации |
| `npm run test-telegram` | Тестирование Telegram API |
| `npm run setup-tunnel` | Настройка HTTPS туннеля |

## 🌐 Доступные эндпоинты

- `GET /health` - Проверка состояния сервера
- `GET /api/products` - Получение товаров
- `GET /api/categories` - Получение категорий
- `GET /catalog` - Веб-интерфейс каталога

## 📱 Telegram команды

- `/start` - Начало работы с ботом
- `/catalog` - Открыть каталог товаров
- `/admin` - Панель администратора (только для админов)

## 🚨 Решение проблем

### Ошибка "Only HTTPS links are allowed"
Используйте `npm run setup-tunnel` для создания HTTPS туннеля

### Ошибка подключения к Telegram API
1. Проверьте правильность TELEGRAM_BOT_TOKEN
2. Запустите `npm run test-telegram`
3. Проверьте интернет-соединение

### Ошибка API МойСклад
1. Проверьте правильность MOYSKLAD_API_TOKEN
2. Убедитесь, что токен имеет необходимые права

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи сервера
2. Запустите `npm run check-config`
3. Проверьте переменные окружения

## 🔧 Минимальная настройка

### Обязательные переменные в .env:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
MOYSKLAD_API_TOKEN=your_api_token
MOYSKLAD_ACCOUNT_ID=your_account_id
```

### Опциональные переменные:
```env
PORT=3000
BASE_URL=http://localhost:3000
ADMIN_IDS=123456789
```

## 🤖 Создание Telegram бота

1. Найдите @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен в .env

## 📊 Настройка МойСклад

1. Войдите в аккаунт МойСклад
2. Перейдите в настройки → API
3. Создайте токен доступа
4. Скопируйте токен и Account ID в .env

## ✅ Проверка работы

1. Запустите проверку конфигурации: `npm run check-config`
2. Запустите бота: `/start`
3. Нажмите "Открыть каталог"
4. Проверьте загрузку товаров

## 🆘 Если что-то не работает

### Проверьте:
- Правильность токена бота
- Правильность API токена МойСклад
- Правильность Account ID
- Наличие товаров в МойСклад
- Логи в консоли

### Полезные команды:
```bash
# Проверка конфигурации
npm run check-config

# Проверка здоровья API
curl http://localhost:3000/api/health

# Проверка подключения к МойСклад
curl http://localhost:3000/api/test-connection

# Проверка бота
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

## 📱 Тестирование

1. Откройте бота в Telegram
2. Отправьте `/start`
3. Нажмите кнопку каталога
4. Проверьте поиск и фильтры

## 🔒 Безопасность

- Не публикуйте .env файл
- Используйте HTTPS в продакшене
- Ограничьте доступ к админ-панели

---

**Подробная документация**: см. README.md и bot-setup.md 