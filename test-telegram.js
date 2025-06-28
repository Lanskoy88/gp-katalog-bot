#!/usr/bin/env node

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

console.log('🔍 Тестирование подключения к Telegram API...\n');

// Проверяем токен
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.log('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения');
  process.exit(1);
}

console.log('✅ TELEGRAM_BOT_TOKEN найден');

// Тестируем подключение
async function testTelegramConnection() {
  try {
    console.log('🔄 Тестирование подключения к api.telegram.org...');
    
    // Создаем бота с минимальными настройками
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: false,
      webHook: false
    });

    // Пробуем получить информацию о боте
    const botInfo = await bot.getMe();
    console.log('✅ Подключение к Telegram API успешно!');
    console.log(`📋 Информация о боте:`);
    console.log(`   - ID: ${botInfo.id}`);
    console.log(`   - Имя: ${botInfo.first_name}`);
    console.log(`   - Username: @${botInfo.username}`);
    console.log(`   - Может присоединяться к группам: ${botInfo.can_join_groups}`);
    console.log(`   - Может читать все сообщения группы: ${botInfo.can_read_all_group_messages}`);
    console.log(`   - Поддерживает inline режим: ${botInfo.supports_inline_queries}`);

    // Тестируем DNS резолвинг
    console.log('\n🔄 Тестирование DNS резолвинга...');
    const dns = require('dns').promises;
    
    try {
      const addresses = await dns.resolve4('api.telegram.org');
      console.log('✅ DNS резолвинг api.telegram.org успешен:');
      addresses.forEach((addr, index) => {
        console.log(`   ${index + 1}. ${addr}`);
      });
    } catch (dnsError) {
      console.log('❌ Ошибка DNS резолвинга:', dnsError.message);
    }

    // Тестируем HTTP подключение
    console.log('\n🔄 Тестирование HTTP подключения...');
    const https = require('https');
    
    const testHttpConnection = () => {
      return new Promise((resolve, reject) => {
        const req = https.get('https://api.telegram.org', (res) => {
          console.log(`✅ HTTP подключение успешно! Статус: ${res.statusCode}`);
          resolve();
        });
        
        req.on('error', (error) => {
          console.log('❌ Ошибка HTTP подключения:', error.message);
          reject(error);
        });
        
        req.setTimeout(10000, () => {
          console.log('❌ Таймаут HTTP подключения');
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
    };

    await testHttpConnection();

    console.log('\n🎉 Все тесты пройдены успешно!');
    console.log('✅ Telegram бот готов к работе');

  } catch (error) {
    console.log('\n❌ Ошибка при тестировании Telegram API:');
    console.log(`   Сообщение: ${error.message}`);
    console.log(`   Код: ${error.code || 'N/A'}`);
    
    if (error.response) {
      console.log(`   HTTP статус: ${error.response.status}`);
      console.log(`   Данные ответа:`, error.response.data);
    }
    
    console.log('\n💡 Возможные решения:');
    console.log('   1. Проверьте правильность TELEGRAM_BOT_TOKEN');
    console.log('   2. Проверьте интернет-соединение');
    console.log('   3. Проверьте настройки DNS');
    console.log('   4. Проверьте настройки прокси/файрвола');
    
    process.exit(1);
  }
}

// Запускаем тест
testTelegramConnection(); 