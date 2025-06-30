const axios = require("axios");
const http = require('http');

// Тестируем основные endpoints админ панели
const testEndpoints = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Тестирование админ панели...\n');
  
  // Тест 1: Проверка здоровья API
  console.log('1. Проверка здоровья API...');
  try {
    const healthResponse = await makeRequest(`${baseUrl}/api/health`);
    console.log('✅ API работает:', healthResponse);
  } catch (error) {
    console.log('❌ Ошибка API:', error.message);
  }
  
  // Тест 2: Проверка статистики
  console.log('\n2. Проверка статистики...');
  try {
    const statsResponse = await makeRequest(`${baseUrl}/api/stats`);
    console.log('✅ Статистика загружена:', statsResponse);
  } catch (error) {
    console.log('❌ Ошибка статистики:', error.message);
  }
  
  // Тест 3: Проверка настроек категорий
  console.log('\n3. Проверка настроек категорий...');
  try {
    const settingsResponse = await makeRequest(`${baseUrl}/api/category-settings`);
    console.log('✅ Настройки категорий загружены:', settingsResponse);
  } catch (error) {
    console.log('❌ Ошибка настроек:', error.message);
  }
  
  // Тест 4: Проверка подключения к МойСклад
  console.log('\n4. Проверка подключения к МойСклад...');
  try {
    const connectionResponse = await makeRequest(`${baseUrl}/api/test-connection`);
    console.log('✅ Тест подключения:', connectionResponse);
  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
  }
  
  // Тест 5: Проверка главной страницы админ панели
  console.log('\n5. Проверка страницы админ панели...');
  try {
    const adminResponse = await makeRequest(`${baseUrl}/admin`, 'GET', null, true);
    console.log('✅ Страница админ панели доступна');
  } catch (error) {
    console.log('❌ Ошибка страницы админ панели:', error.message);
  }
  
  console.log('\n🎯 Инструкция по входу в админ панель:');
  console.log('1. Откройте браузер');
  console.log('2. Перейдите по адресу: http://localhost:3000/admin');
  console.log('3. Админ панель должна загрузиться автоматически');
  console.log('4. Если есть проблемы с подключением к МойСклад, проверьте переменные окружения');
};

// Функция для выполнения HTTP запросов
const makeRequest = (url, method = 'GET', data = null, textMode = false) => {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const req = http.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (textMode) {
            resolve('OK');
          } else {
            try {
              const parsed = JSON.parse(responseData);
              resolve(parsed);
            } catch (e) {
              resolve(responseData);
            }
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
};

// Запускаем тесты
testEndpoints().catch(console.error);
