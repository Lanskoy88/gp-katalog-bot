const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const MoyskladService = require('./services/moyskladService');
const botHandlers = require('./handlers/botHandlers');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'https://gp-katalog-bot.onrender.com';

// Увеличиваем лимит заголовков для избежания ошибки 431
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Отключаем CSP для Telegram Web App
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
const corsOrigins = [
  'https://web.telegram.org',
  'http://localhost:3000',
  'http://localhost:3002',
  'https://gp-katalog.loca.lt',
  'https://gp-katalog-images.loca.lt'
];

// Добавляем продакшн домены если они есть
if (process.env.ALLOWED_ORIGINS) {
  corsOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

// Добавляем Railway домены
if (process.env.RAILWAY_STATIC_URL) {
  corsOrigins.push(process.env.RAILWAY_STATIC_URL);
}

// В продакшне разрешаем все домены для Telegram Web App
if (process.env.NODE_ENV === 'production') {
  corsOrigins.push('*');
}

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : corsOrigins,
  credentials: true
}));

// Проверяем существование файлов сборки
const buildPath = path.join(__dirname, '../client/build');
const indexPath = path.join(buildPath, 'index.html');

// Static files from React build (только если файлы существуют)
if (fs.existsSync(buildPath)) {
  app.use('/static', express.static(path.join(buildPath, 'static')));
  console.log('Static files directory found and configured');
} else {
  console.log('Warning: Client build directory not found');
}

// API routes
app.use('/api', apiRoutes);

// Telegram bot setup с улучшенной обработкой ошибок и поддержкой вебхуков
let bot;

try {
  const isProduction = process.env.NODE_ENV === 'production';
  const useWebhook = isProduction; // На Render всегда используем webhook
  
  console.log('Initializing Telegram bot...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Use webhook:', useWebhook);
  console.log('Bot token length:', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 'NOT SET');
  
  if (useWebhook) {
    // Конфигурация для вебхуков в продакшне
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
      webHook: false, // Отключаем встроенный webhook
      request: {
        timeout: 30000,
        proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY
      }
    });
    
    const webhookUrl = `${BASE_URL}/webhook`;
    console.log(`Setting up webhook for URL: ${webhookUrl}`);
    
    bot.setWebHook(webhookUrl, {
      allowed_updates: [
        'message',
        'edited_message',
        'callback_query',
        'inline_query',
        'chosen_inline_result'
      ]
    }).then(() => {
      console.log(`✅ Webhook successfully set to: ${webhookUrl}`);
    }).catch((error) => {
      console.error(`❌ Failed to set webhook: ${error.message}`);
    });
    
    console.log(`Webhook установлен на: ${webhookUrl}`);
  } else {
    // Конфигурация для polling (разработка)
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
      polling: {
        interval: 300,
        autoStart: false,
        params: {
          timeout: 10
        }
      },
      webHook: false,
      request: {
        timeout: 30000,
        proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY
      }
    });

    // Обработка ошибок подключения для polling
    bot.on('polling_error', (error) => {
      console.error('Polling error:', error.message);
      
      // Если ошибка связана с DNS или сетью, пробуем переподключиться
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log('Network error detected, attempting to reconnect in 30 seconds...');
        setTimeout(() => {
          try {
            bot.stopPolling();
            setTimeout(() => {
              bot.startPolling();
              console.log('Reconnection attempt completed');
            }, 5000);
          } catch (reconnectError) {
            console.error('Reconnection failed:', reconnectError.message);
          }
        }, 30000);
      }
    });

    // Запускаем polling только если токен валидный
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.length > 10) {
      bot.startPolling();
      console.log('Bot polling started successfully');
    } else {
      console.warn('Invalid or missing TELEGRAM_BOT_TOKEN, bot not started');
    }
  }

  bot.on('error', (error) => {
    console.error('Bot error:', error.message);
  });

  console.log('✅ Bot initialized successfully');

} catch (error) {
  console.error('Failed to initialize Telegram bot:', error.message);
  bot = null;
}

// Bot handlers
console.log('Setting up bot handlers...');
botHandlers.setup(bot);
console.log('Bot handlers setup completed');

// Проверяем, что бот правильно инициализирован
if (bot) {
  console.log('Bot instance details:');
  console.log('- Bot token exists:', !!process.env.TELEGRAM_BOT_TOKEN);
  console.log('- Bot token length:', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 'NOT SET');
  console.log('- Bot methods available:', Object.keys(bot).filter(key => typeof bot[key] === 'function').slice(0, 10));
  console.log('- Bot has processUpdate method:', typeof bot.processUpdate === 'function');
  console.log('- Bot has onText method:', typeof bot.onText === 'function');
} else {
  console.error('❌ Bot is null - handlers cannot be set up');
}

// Webhook endpoint for Telegram
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', {
    method: req.method,
    url: req.url,
    body: req.body
  });
  
  if (!bot) {
    console.error('❌ Bot not initialized, cannot handle webhook');
    return res.sendStatus(500);
  }
  
  if (!req.body || !req.body.update_id) {
    console.error('❌ Invalid webhook data received');
    return res.sendStatus(400);
  }
  
  try {
    console.log('Processing webhook update with ID:', req.body.update_id);
    
    // Проверяем, что у бота есть метод processUpdate
    if (typeof bot.processUpdate !== 'function') {
      console.error('❌ Bot does not have processUpdate method');
      console.log('Available bot methods:', Object.keys(bot).filter(key => typeof bot[key] === 'function'));
      return res.sendStatus(500);
    }
    
    // Используем правильный метод для обработки обновлений
    bot.processUpdate(req.body);
    console.log('✅ Webhook update handled successfully');
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error handling webhook update:', error);
    console.error('Error stack:', error.stack);
    res.sendStatus(500);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    botStatus: bot ? (bot.isPolling() ? 'polling' : 'webhook') : 'not initialized',
    environment: process.env.NODE_ENV || 'development',
    baseUrl: BASE_URL
  });
});

// Serve React app for all other routes (SPA) - только если файл существует
app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ 
      message: 'Telegram Bot API is running',
      status: 'Client build not found, but API is working',
      endpoints: {
        health: '/health',
        api: '/api',
        webhook: '/webhook'
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bot is running...`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Mode: ${process.env.NODE_ENV === 'production' && process.env.USE_WEBHOOK === 'true' ? 'webhook' : 'polling'}`);
});

module.exports = app; 