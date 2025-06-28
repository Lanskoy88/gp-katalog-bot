#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка конфигурации для Render...\n');

// Проверка наличия необходимых файлов
const requiredFiles = [
  'package.json',
  'render.yaml',
  'server/index.js',
  'client/build/index.html'
];

console.log('📁 Проверка файлов:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) {
    console.log(`    ⚠️  Файл ${file} не найден!`);
  }
});

// Проверка package.json
console.log('\n📦 Проверка package.json:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Проверка скриптов
  const requiredScripts = ['start', 'install-all'];
  requiredScripts.forEach(script => {
    const exists = packageJson.scripts && packageJson.scripts[script];
    console.log(`  ${exists ? '✅' : '❌'} Скрипт "${script}"`);
  });
  
  // Проверка зависимостей
  const requiredDeps = ['express', 'node-telegram-bot-api', 'axios'];
  requiredDeps.forEach(dep => {
    const exists = packageJson.dependencies && packageJson.dependencies[dep];
    console.log(`  ${exists ? '✅' : '❌'} Зависимость "${dep}"`);
  });
  
} catch (error) {
  console.log('  ❌ Ошибка чтения package.json:', error.message);
}

// Проверка render.yaml
console.log('\n⚙️  Проверка render.yaml:');
try {
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  
  const requiredConfigs = [
    'type: web',
    'name: gp-katalog-bot',
    'env: node',
    'buildCommand: npm run install-all',
    'startCommand: npm start'
  ];
  
  requiredConfigs.forEach(config => {
    const exists = renderYaml.includes(config);
    console.log(`  ${exists ? '✅' : '❌'} ${config}`);
  });
  
} catch (error) {
  console.log('  ❌ Ошибка чтения render.yaml:', error.message);
}

// Проверка переменных окружения
console.log('\n🔧 Проверка переменных окружения:');
const envFile = '.env';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  const requiredVars = [
    'TELEGRAM_BOT_TOKEN',
    'MOYSKLAD_API_TOKEN',
    'MOYSKLAD_ACCOUNT_ID'
  ];
  
  requiredVars.forEach(varName => {
    const exists = envContent.includes(varName + '=');
    console.log(`  ${exists ? '✅' : '❌'} ${varName}`);
  });
} else {
  console.log('  ⚠️  Файл .env не найден');
}

// Проверка клиентской сборки
console.log('\n🏗️  Проверка клиентской сборки:');
const buildPath = path.join('client', 'build');
if (fs.existsSync(buildPath)) {
  const buildFiles = fs.readdirSync(buildPath);
  console.log(`  ✅ Папка build найдена (${buildFiles.length} файлов)`);
  
  const hasIndexHtml = fs.existsSync(path.join(buildPath, 'index.html'));
  console.log(`  ${hasIndexHtml ? '✅' : '❌'} index.html`);
  
  const hasStatic = fs.existsSync(path.join(buildPath, 'static'));
  console.log(`  ${hasStatic ? '✅' : '❌'} папка static`);
} else {
  console.log('  ❌ Папка client/build не найдена');
  console.log('  💡 Запустите: npm run build');
}

// Рекомендации
console.log('\n📋 Рекомендации для Render:');
console.log('1. Убедитесь что репозиторий подключен к Render');
console.log('2. Настройте переменные окружения в Render Dashboard');
console.log('3. Установите BASE_URL=https://gp-katalog-bot.onrender.com');
console.log('4. Обновите URL Web App в BotFather после развертывания');

console.log('\n🚀 Готово к развертыванию на Render!');
console.log('📖 Подробные инструкции: RENDER_SETUP.md'); 