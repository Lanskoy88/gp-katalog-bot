require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

console.log('Testing Telegram bot initialization...');
console.log('Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('- TELEGRAM_BOT_TOKEN length:', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 'NOT SET');

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

try {
  console.log('\nCreating bot instance...');
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    webHook: false,
    request: {
      timeout: 30000
    }
  });

  console.log('✅ Bot instance created successfully');
  console.log('Bot methods available:', Object.keys(bot).filter(key => typeof bot[key] === 'function').slice(0, 15));
  console.log('- processUpdate method:', typeof bot.processUpdate === 'function');
  console.log('- onText method:', typeof bot.onText === 'function');
  console.log('- sendMessage method:', typeof bot.sendMessage === 'function');
  console.log('- setWebHook method:', typeof bot.setWebHook === 'function');

  // Тестируем установку webhook
  const webhookUrl = 'https://gp-katalog-bot.onrender.com/webhook';
  console.log(`\nTesting webhook setup to: ${webhookUrl}`);
  
  bot.setWebHook(webhookUrl).then(() => {
    console.log('✅ Webhook set successfully');
    
    // Получаем информацию о webhook
    return bot.getWebhookInfo();
  }).then((webhookInfo) => {
    console.log('Webhook info:', webhookInfo);
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error setting webhook:', error.message);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ Error creating bot instance:', error.message);
  process.exit(1);
} 