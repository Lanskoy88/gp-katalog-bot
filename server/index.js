const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const moyskladService = require('./services/moyskladService');
const botHandlers = require('./handlers/botHandlers');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting with localtunnel
app.set('trust proxy', 1);

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
  'https://gp-katalog.loca.lt'
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files from React build
app.use('/static', express.static(path.join(__dirname, '../client/build/static')));

// API routes
app.use('/api', apiRoutes);

// Telegram bot setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Bot handlers
botHandlers.setup(bot);

// Webhook endpoint for Telegram
app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bot is running...`);
});

module.exports = app; 