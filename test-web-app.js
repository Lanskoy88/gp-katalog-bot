const axios = require('axios');

// Тестируем веб-приложение
const BASE_URL = 'https://gp-katalog-bot.onrender.com';

async function testWebApp() {
  console.log('🌐 Тестирование веб-приложения...\n');
  
  try {
    // 1. Проверка главной страницы
    console.log('1. Проверка главной страницы...');
    const mainPage = await axios.get(BASE_URL);
    console.log('✅ Главная страница загружается');
    console.log('   Content-Type:', mainPage.headers['content-type']);
    console.log('   Status:', mainPage.status);
    
    // 2. Проверка здоровья API
    console.log('\n2. Проверка здоровья API...');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ API здоров');
    console.log('   Status:', health.data.status);
    
    // 3. Проверка диагностики
    console.log('\n3. Проверка диагностики MoySklad...');
    const diagnostics = await axios.get(`${BASE_URL}/api/diagnostics`);
    console.log('✅ Диагностика работает');
    console.log('   Products:', diagnostics.data.productsCount);
    console.log('   Categories:', diagnostics.data.categoriesCount);
    
    // 4. Проверка категорий
    console.log('\n4. Проверка категорий...');
    const categories = await axios.get(`${BASE_URL}/api/categories`);
    console.log('✅ Категории загружены');
    console.log('   Count:', categories.data.length);
    console.log('   Categories:', categories.data.map(c => c.name));
    
    // 5. Проверка товаров
    console.log('\n5. Проверка товаров...');
    const products = await axios.get(`${BASE_URL}/api/products?page=1&limit=5`);
    console.log('✅ Товары загружены');
    console.log('   Total:', products.data.total);
    console.log('   Loaded:', products.data.products.length);
    console.log('   Has more:', products.data.hasMore);
    
    // 6. Проверка статистики
    console.log('\n6. Проверка статистики...');
    const stats = await axios.get(`${BASE_URL}/api/stats`);
    console.log('✅ Статистика загружена');
    console.log('   Stats:', stats.data);
    
    console.log('\n🎉 Все тесты прошли успешно!');
    console.log('\n📱 Приложение готово к использованию в Telegram Web App');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Запускаем тест
testWebApp(); 