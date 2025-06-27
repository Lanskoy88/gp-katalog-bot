# 🚀 Инструкции по деплою GP Katalog Bot

## 📋 Подготовка к деплою

### 1. Создайте репозиторий на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gp-katalog-bot.git
git push -u origin main
```

### 2. Подготовьте переменные окружения
Создайте файл `.env` с вашими данными:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
MOYSKLAD_API_TOKEN=your_moysklad_token
NODE_ENV=production
PORT=3000
```

## 🚀 Варианты деплоя

### Вариант 1: Railway (Рекомендуемый)

1. **Зарегистрируйтесь на [Railway](https://railway.app/)**
2. **Подключите GitHub репозиторий**
3. **Настройте переменные окружения:**
   - `TELEGRAM_BOT_TOKEN`
   - `MOYSKLAD_API_TOKEN`
   - `NODE_ENV=production`
4. **Деплой произойдет автоматически**

**Преимущества:**
- ✅ Бесплатный план
- ✅ Автоматический HTTPS
- ✅ Простая настройка
- ✅ Автоматический деплой из GitHub

### Вариант 2: Render

1. **Зарегистрируйтесь на [Render](https://render.com/)**
2. **Создайте новый Web Service**
3. **Подключите GitHub репозиторий**
4. **Настройте:**
   - **Build Command:** `npm run install-all && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `TELEGRAM_BOT_TOKEN`
     - `MOYSKLAD_API_TOKEN`
     - `NODE_ENV=production`

### Вариант 3: Heroku

1. **Установите Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Создайте приложение:**
   ```bash
   heroku create gp-katalog-bot
   ```

3. **Настройте переменные окружения:**
   ```bash
   heroku config:set TELEGRAM_BOT_TOKEN=your_token
   heroku config:set MOYSKLAD_API_TOKEN=your_token
   heroku config:set NODE_ENV=production
   ```

4. **Деплой:**
   ```bash
   git push heroku main
   ```

### Вариант 4: VPS (DigitalOcean, Vultr, etc.)

1. **Создайте VPS сервер (Ubuntu 20.04+)**
2. **Подключитесь по SSH:**
   ```bash
   ssh root@your_server_ip
   ```

3. **Установите Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Установите PM2:**
   ```bash
   npm install -g pm2
   ```

5. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/gp-katalog-bot.git
   cd gp-katalog-bot
   ```

6. **Установите зависимости:**
   ```bash
   npm run install-all
   npm run build
   ```

7. **Создайте .env файл:**
   ```bash
   nano .env
   # Добавьте ваши переменные окружения
   ```

8. **Запустите с PM2:**
   ```bash
   pm2 start server/index.js --name "gp-katalog-bot"
   pm2 startup
   pm2 save
   ```

9. **Настройте Nginx (опционально):**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/gp-katalog-bot
   ```

   ```nginx
   server {
       listen 80;
       server_name your_domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/gp-katalog-bot /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 🔧 После деплоя

### 1. Обновите URL бота в Telegram
После получения URL вашего сервера (например, `https://gp-katalog-bot.railway.app`), обновите webhook:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/webhook"}'
```

### 2. Обновите CORS настройки
В `server/index.js` добавьте ваш домен в CORS:

```javascript
app.use(cors({
  origin: [
    'https://web.telegram.org', 
    'http://localhost:3000', 
    'https://your-domain.com'
  ],
  credentials: true
}));
```

### 3. Проверьте работу
- Откройте `https://your-domain.com/api/products`
- Должны вернуться данные товаров
- Проверьте бота в Telegram

## 🐛 Устранение проблем

### Проблема: "Cannot find module"
**Решение:** Убедитесь, что все зависимости установлены:
```bash
npm run install-all
```

### Проблема: "Port already in use"
**Решение:** Используйте переменную окружения PORT:
```bash
export PORT=3000
```

### Проблема: "Telegram bot not responding"
**Решение:** Проверьте токен и webhook:
```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

## 📞 Поддержка

Если возникли проблемы с деплоем, проверьте:
1. Логи сервера
2. Переменные окружения
3. Сетевые настройки
4. Права доступа к файлам

## 🎉 Готово!

После успешного деплоя ваш бот будет доступен 24/7 без необходимости запускать localtunnel! 