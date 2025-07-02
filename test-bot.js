require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

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

  // Тестируем бота
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const BASE_URL = 'https://gp-katalog-bot.onrender.com';

  async function testBot() {
    console.log('🤖 Тестирование бота...\n');
    
    if (!BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN не установлен');
      return;
    }
    
    try {
      // 1. Проверка информации о боте
      console.log('1. Проверка информации о боте...');
      const botInfo = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
      console.log('✅ Информация о боте получена');
      console.log('   Имя:', botInfo.data.result.first_name);
      console.log('   Username:', botInfo.data.result.username);
      console.log('   ID:', botInfo.data.result.id);
      
      // 2. Проверка webhook
      console.log('\n2. Проверка webhook...');
      const webhookInfo = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      console.log('✅ Webhook информация получена');
      console.log('   URL:', webhookInfo.data.result.url);
      console.log('   Has custom certificate:', webhookInfo.data.result.has_custom_certificate);
      console.log('   Pending update count:', webhookInfo.data.result.pending_update_count);
      console.log('   Last error date:', webhookInfo.data.result.last_error_date);
      console.log('   Last error message:', webhookInfo.data.result.last_error_message);
      
      // 3. Проверка обновлений
      console.log('\n3. Проверка обновлений...');
      const updates = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=5`);
      console.log('✅ Обновления получены');
      console.log('   Количество обновлений:', updates.data.result.length);
      
      if (updates.data.result.length > 0) {
        const lastUpdate = updates.data.result[updates.data.result.length - 1];
        console.log('   Последнее обновление ID:', lastUpdate.update_id);
        console.log('   Тип:', lastUpdate.message ? 'message' : 'callback_query');
      }
      
      // 4. Проверка webhook URL
      console.log('\n4. Проверка webhook URL...');
      const webhookUrl = `${BASE_URL}/webhook`;
      console.log('   Ожидаемый webhook URL:', webhookUrl);
      console.log('   Фактический webhook URL:', webhookInfo.data.result.url);
      
      if (webhookInfo.data.result.url === webhookUrl) {
        console.log('✅ Webhook URL корректный');
      } else {
        console.log('⚠️ Webhook URL не совпадает');
        console.log('   Попытка установить правильный webhook...');
        
        try {
          await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            url: webhookUrl,
            allowed_updates: ['message', 'edited_message', 'callback_query', 'inline_query', 'chosen_inline_result']
          });
          console.log('✅ Webhook установлен');
        } catch (error) {
          console.error('❌ Ошибка установки webhook:', error.response?.data || error.message);
        }
      }
      
      console.log('\n🎉 Тестирование бота завершено');
      console.log('\n💡 Для проверки реакции на /start:');
      console.log('   1. Найдите бота в Telegram: @' + botInfo.data.result.username);
      console.log('   2. Отправьте команду /start');
      console.log('   3. Проверьте, что бот отвечает');
      
    } catch (error) {
      console.error('❌ Ошибка при тестировании бота:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
    }
  }

  // Запускаем тест
  testBot();

} catch (error) {
  console.error('❌ Error creating bot instance:', error.message);
  process.exit(1);
} 