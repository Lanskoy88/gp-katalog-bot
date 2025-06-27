#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

async function checkConfiguration() {
  console.log('🔍 Проверка конфигурации Telegram Bot с каталогом товаров МойСклад');
  console.log('==============================================================\n');

  // Проверка переменных окружения
  console.log('📋 Проверка переменных окружения:');

  const requiredVars = [
    'TELEGRAM_BOT_TOKEN',
    'MOYSKLAD_API_TOKEN', 
    'MOYSKLAD_ACCOUNT_ID'
  ];

  const optionalVars = [
    'PORT',
    'NODE_ENV',
    'BASE_URL',
    'ADMIN_IDS'
  ];

  let allRequiredVarsPresent = true;

  console.log('\nОбязательные переменные:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: НЕ НАЙДЕНА`);
      allRequiredVarsPresent = false;
    }
  });

  console.log('\nОпциональные переменные:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`⚠️  ${varName}: не установлена (используется значение по умолчанию)`);
    }
  });

  if (!allRequiredVarsPresent) {
    console.log('\n❌ Ошибка: Не все обязательные переменные окружения установлены!');
    console.log('Создайте файл .env на основе env.example и заполните все обязательные поля.');
    process.exit(1);
  }

  console.log('\n✅ Все обязательные переменные окружения установлены!');

  // Проверка Telegram Bot
  console.log('\n🤖 Проверка Telegram Bot:');
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

  try {
    const response = await axios.get(`https://api.telegram.org/bot${telegramToken}/getMe`);
    const bot = response.data;
    
    if (bot.ok) {
      console.log(`✅ Бот найден: @${bot.result.username}`);
      console.log(`   Имя: ${bot.result.first_name}`);
      console.log(`   ID: ${bot.result.id}`);
    } else {
      console.log('❌ Ошибка при получении информации о боте');
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к Telegram API:');
    console.log(`   ${error.message}`);
  }

  // Проверка МойСклад API
  console.log('\n📊 Проверка МойСклад API:');
  const moyskladToken = process.env.MOYSKLAD_API_TOKEN;
  const accountId = process.env.MOYSKLAD_ACCOUNT_ID;

  try {
    const response = await axios.get('https://api.moysklad.ru/api/remap/1.2/entity/product?limit=1', {
      headers: {
        'Authorization': `Bearer ${moyskladToken}`,
        'Accept': 'application/json;charset=utf-8',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Подключение к МойСклад API успешно');
    console.log(`   Account ID: ${accountId}`);
    console.log(`   Товаров в каталоге: ${response.data.meta.size}`);
    
    if (response.data.rows.length > 0) {
      console.log(`   Пример товара: ${response.data.rows[0].name}`);
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к МойСклад API:');
    if (error.response) {
      console.log(`   Статус: ${error.response.status}`);
      console.log(`   Сообщение: ${error.response.data.error || error.message}`);
    } else {
      console.log(`   ${error.message}`);
    }
  }

  // Проверка порта
  console.log('\n🌐 Проверка настроек сервера:');
  const port = process.env.PORT || 3000;
  console.log(`   Порт: ${port}`);
  console.log(`   Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Base URL: ${process.env.BASE_URL || `http://localhost:${port}`}`);

  // Проверка админов
  console.log('\n👤 Проверка администраторов:');
  const adminIds = process.env.ADMIN_IDS;
  if (adminIds) {
    const admins = adminIds.split(',').map(id => id.trim());
    console.log(`   Найдено администраторов: ${admins.length}`);
    admins.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
  } else {
    console.log('⚠️  Администраторы не настроены');
    console.log('   Установите переменную ADMIN_IDS для доступа к панели управления');
  }

  console.log('\n🎉 Проверка конфигурации завершена!');
  console.log('\n📝 Следующие шаги:');
  console.log('1. Запустите сервер: npm run dev');
  console.log('2. Откройте бота в Telegram и отправьте /start');
  console.log('3. Нажмите "Открыть каталог" для тестирования');
  console.log('4. Используйте /admin для доступа к панели управления');

  if (!adminIds) {
    console.log('\n⚠️  Рекомендация: Настройте ADMIN_IDS для доступа к панели управления');
  }
}

// Запуск проверки
checkConfiguration().catch(error => {
  console.error('❌ Ошибка при проверке конфигурации:', error.message);
  process.exit(1);
}); 