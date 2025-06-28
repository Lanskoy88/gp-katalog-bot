#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Настройка туннеля для Telegram Web App...\n');

// Проверяем, установлен ли localtunnel
function checkLocaltunnel() {
  return new Promise((resolve) => {
    const check = spawn('npx', ['localtunnel', '--version'], { stdio: 'pipe' });
    
    check.on('close', (code) => {
      resolve(code === 0);
    });
    
    check.on('error', () => {
      resolve(false);
    });
  });
}

// Запускаем localtunnel
function startLocaltunnel() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Запуск localtunnel...');
    
    const tunnel = spawn('npx', ['localtunnel', '--port', '3000', '--subdomain', 'gp-katalog-bot'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let url = null;
    
    tunnel.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('📡 Туннель:', output.trim());
      
      // Ищем URL в выводе
      const urlMatch = output.match(/your url is: (https:\/\/[^\s]+)/);
      if (urlMatch) {
        url = urlMatch[1];
        console.log(`\n✅ Туннель запущен: ${url}`);
        
        // Сохраняем URL в файл
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        // Обновляем или добавляем BASE_URL
        if (envContent.includes('BASE_URL=')) {
          envContent = envContent.replace(/BASE_URL=.*/g, `BASE_URL=${url}`);
        } else {
          envContent += `\nBASE_URL=${url}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`📝 BASE_URL обновлен в .env файле`);
        
        resolve({ tunnel, url });
      }
    });
    
    tunnel.stderr.on('data', (data) => {
      console.error('❌ Ошибка туннеля:', data.toString());
    });
    
    tunnel.on('error', (error) => {
      console.error('❌ Ошибка запуска туннеля:', error.message);
      reject(error);
    });
    
    tunnel.on('close', (code) => {
      console.log(`🔌 Туннель закрыт с кодом: ${code}`);
    });
    
    // Таймаут на случай, если URL не найден
    setTimeout(() => {
      if (!url) {
        reject(new Error('Таймаут ожидания URL туннеля'));
      }
    }, 10000);
  });
}

// Основная функция
async function main() {
  try {
    const hasLocaltunnel = await checkLocaltunnel();
    
    if (!hasLocaltunnel) {
      console.log('📦 Установка localtunnel...');
      await new Promise((resolve, reject) => {
        const install = spawn('npm', ['install', '-g', 'localtunnel'], { stdio: 'inherit' });
        install.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Установка завершилась с кодом ${code}`));
        });
      });
    }
    
    const { tunnel, url } = await startLocaltunnel();
    
    console.log('\n🎉 Настройка завершена!');
    console.log(`🌐 Ваш бот доступен по адресу: ${url}`);
    console.log(`📱 Используйте этот URL в Telegram Web App`);
    console.log('\n💡 Для остановки туннеля нажмите Ctrl+C');
    
    // Обработка завершения
    process.on('SIGINT', () => {
      console.log('\n🛑 Остановка туннеля...');
      tunnel.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Ошибка настройки туннеля:', error.message);
    process.exit(1);
  }
}

// Запускаем только если файл вызван напрямую
if (require.main === module) {
  main();
}

module.exports = { startLocaltunnel, checkLocaltunnel }; 