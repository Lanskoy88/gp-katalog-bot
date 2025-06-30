# 🚀 Деплой GP Katalog на Render с поддержкой админ-панели и МойСклад

## 📋 Требования

- Node.js 18+ 
- npm или yarn
- Telegram Bot Token
- МойСклад API Token

## 🔧 Локальная настройка

### 1. Клонирование и установка

```bash
git clone <your-repo-url>
cd gp-katalog-bot
npm run install-all
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Обязательные переменные
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
MOYSKLAD_API_TOKEN=your_moysklad_api_token

# Опциональные переменные
BASE_URL=https://your-domain.com
PORT=3000
NODE_ENV=development
ADMIN_IDS=123456789,987654321
ALLOWED_ORIGINS=https://web.telegram.org
```

### 3. Проверка конфигурации

```bash
npm run check-config
```

### 4. Сборка клиента

```bash
npm run build
```

### 5. Запуск

```bash
# Для разработки
npm run dev

# Для продакшна
npm start
```

## 🌐 Развертывание на Render

### 1. Подготовка к развертыванию

1. Убедитесь, что все изменения закоммичены в Git
2. Проверьте, что файл `render.yaml` настроен правильно
3. Убедитесь, что все переменные окружения указаны в `render.yaml`

### 2. Развертывание

1. Зайдите на [Render.com](https://render.com)
2. Создайте новый Web Service
3. Подключите ваш GitHub репозиторий
4. Настройте переменные окружения:
   - `TELEGRAM_BOT_TOKEN`
   - `MOYSKLAD_API_TOKEN`
   - `BASE_URL` (URL вашего Render сервиса)
   - `ADMIN_IDS` (опционально)

### 3. Настройка переменных окружения на Render

В настройках сервиса на Render добавьте следующие переменные:

| Переменная | Описание | Пример |
|------------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Токен вашего Telegram бота | `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `MOYSKLAD_API_TOKEN` | Токен API МойСклад | `your_moysklad_token` |
| `BASE_URL` | URL вашего сервиса | `https://your-app.onrender.com` |
| `ADMIN_IDS` | ID администраторов (через запятую) | `123456789,987654321` |
| `NODE_ENV` | Окружение | `production` |

### 4. Проверка развертывания

После развертывания проверьте:

1. **Health Check**: `https://your-app.onrender.com/health`
2. **API**: `https://your-app.onrender.com/api/products`
3. **Telegram Bot**: Отправьте `/start` вашему боту

## 🔍 Устранение проблем

### Проблема: "Client build not found"

**Решение**: Убедитесь, что в `package.json` есть правильный скрипт сборки:

```json
{
  "scripts": {
    "postinstall": "cd client && npm install && npm run build"
  }
}
```

### Проблема: "Accept header error" от МойСклад

**Решение**: Проверьте, что в `moyskladService.js` используется правильный заголовок:

```javascript
headers: {
  'Accept': 'application/json;charset=utf-8',
  'Content-Type': 'application/json'
}
```

### Проблема: Telegram Bot не отвечает

**Решение**: 
1. Проверьте токен бота
2. Убедитесь, что бот не заблокирован
3. Проверьте логи на Render

### Проблема: CORS ошибки

**Решение**: Убедитесь, что в `server/index.js` настроены правильные CORS домены:

```javascript
const corsOrigins = [
  'https://web.telegram.org',
  'http://localhost:3000'
];
```

## 📊 Мониторинг

### Логи на Render

Проверяйте логи в панели управления Render для диагностики проблем.

### Health Check

Используйте endpoint `/health` для проверки состояния сервиса:

```bash
curl https://your-app.onrender.com/health
```

### Telegram Bot Status

Проверьте статус бота через API:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

## 🔄 Обновление

Для обновления приложения:

1. Внесите изменения в код
2. Закоммитьте и запушьте в Git
3. Render автоматически пересоберет и развернет приложение

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи на Render
2. Убедитесь, что все переменные окружения настроены
3. Проверьте конфигурацию с помощью `npm run check-config`
4. Обратитесь к документации Telegram Bot API и МойСклад API 

## 1. Подготовка репозитория

1. Убедитесь, что в `package.json`:
   - В секции `engines`:
     ```json
     "engines": {
       "node": ">=18.0.0",
       "npm": ">=8.0.0"
     }
     ```
   - Все зависимости актуальны (см. основной `package.json`)
2. Удалите локально папки `node_modules` и `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Соберите клиент:
   ```bash
   cd client && npm install && npm run build && cd ..
   ```
4. Проверьте, что сервер запускается локально (Node.js 18+):
   ```bash
   npm start
   ```

## 2. Загрузка на GitHub

1. Создайте приватный репозиторий на GitHub (или используйте существующий).
2. Залейте весь проект в репозиторий.

## 3. Создание Render Web Service

1. Перейдите на https://dashboard.render.com/
2. Нажмите **New +** → **Web Service**
3. Выберите ваш репозиторий
4. Render сам определит команду запуска: `node server/index.js`
5. В разделе **Environment** добавьте переменные окружения:
   - `TELEGRAM_BOT_TOKEN` — токен вашего Telegram-бота
   - `MOYSKLAD_API_TOKEN` — API-токен МойСклад
   - `MOYSKLAD_ACCOUNT_ID` — ID аккаунта МойСклад
   - `BASE_URL` — адрес вашего приложения на Render (например, `https://your-app.onrender.com`)
   - `ADMIN_IDS` — Telegram ID админов через запятую
   - `JWT_SECRET` — любой секрет для JWT
   - другие переменные из `.env`, если используются
6. Убедитесь, что в корне проекта есть файл `Procfile`:
   ```
   web: node server/index.js
   ```
7. Нажмите **Create Web Service**

## 4. Проверка деплоя

- После билда Render покажет ссылку на ваше приложение (например, `https://your-app.onrender.com`)
- Откройте `https://your-app.onrender.com/admin` — должна загрузиться админ-панель с реальными категориями из МойСклад
- Проверьте работу всех функций (тест подключения, скрытие/отображение категорий, сохранение)
- Проверьте мини-приложение в Telegram — скрытые категории не должны отображаться

## 5. Безопасность

- Никогда не публикуйте токены и секреты в публичном репозитории!
- Используйте только переменные окружения через Render Dashboard

## 6. Troubleshooting

- Если что-то не работает — смотрите логи Render (Logs)
- Проверьте правильность переменных окружения
- Проверьте, что токены актуальны
- Проверьте, что endpoints `/api/category-settings`, `/api/stats`, `/api/test-connection` возвращают реальные данные

---

**Всё готово!**

Если потребуется помощь с настройкой МойСклад или Telegram-бота — напишите в README или обратитесь к разработчику. 