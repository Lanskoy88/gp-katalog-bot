#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 Проверка конфигурации Telegram бота...\n');

// Проверяем обязательные переменные окружения
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'MOYSKLAD_API_TOKEN'
];

const missingVars = [];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: НЕ НАЙДЕН`);
  } else {
    console.log(`✅ ${varName}: НАЙДЕН`);
  }
});

// Проверяем опциональные переменные
const optionalEnvVars = [
  'BASE_URL',
  'PORT',
  'NODE_ENV',
  'ADMIN_IDS',
  'ALLOWED_ORIGINS'
];

console.log('\n📋 Опциональные переменные:');
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: ${process.env[varName]}`);
  } else {
    console.log(`⚠️  ${varName}: НЕ УСТАНОВЛЕН`);
  }
});

// Проверяем структуру проекта
const fs = require('fs');
const path = require('path');

console.log('\n📁 Проверка структуры проекта:');

const requiredFiles = [
  'server/index.js',
  'server/handlers/botHandlers.js',
  'server/services/moyskladService.js',
  'server/routes/api.js',
  'client/package.json'
];

requiredFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${filePath}: НАЙДЕН`);
  } else {
    console.log(`❌ ${filePath}: НЕ НАЙДЕН`);
  }
});

// Проверяем клиентскую сборку
const buildPath = path.join(__dirname, 'client/build');
const indexPath = path.join(buildPath, 'index.html');

if (fs.existsSync(buildPath)) {
  console.log(`✅ client/build: НАЙДЕН`);
  if (fs.existsSync(indexPath)) {
    console.log(`✅ client/build/index.html: НАЙДЕН`);
  } else {
    console.log(`❌ client/build/index.html: НЕ НАЙДЕН`);
  }
} else {
  console.log(`⚠️  client/build: НЕ НАЙДЕН (нужно выполнить npm run build)`);
}

// Итоговая оценка
console.log('\n📊 ИТОГОВАЯ ОЦЕНКА:');

if (missingVars.length === 0) {
  console.log('✅ Все обязательные переменные окружения настроены');
} else {
  console.log(`❌ Отсутствуют обязательные переменные: ${missingVars.join(', ')}`);
  console.log('\n💡 Для настройки создайте файл .env в корне проекта:');
  console.log('TELEGRAM_BOT_TOKEN=your_bot_token_here');
  console.log('MOYSKLAD_API_TOKEN=your_moysklad_token_here');
  console.log('BASE_URL=https://your-domain.com');
}

if (fs.existsSync(indexPath)) {
  console.log('✅ Клиентская сборка готова');
} else {
  console.log('⚠️  Клиентская сборка отсутствует');
  console.log('💡 Выполните: npm run build');
}

console.log('\n🚀 Для запуска бота используйте: npm start');
console.log('🔧 Для разработки используйте: npm run dev'); 