const axios = require('axios');

// Тестируем API endpoints
const API_BASE = 'https://gp-katalog-bot.onrender.com/api';

async function testAPI() {
  console.log('🧪 Тестирование API endpoints...\n');
  
  try {
    // 1. Проверка здоровья API
    console.log('1. Проверка здоровья API...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', health.data);
    
    // 2. Диагностика MoySklad
    console.log('\n2. Диагностика MoySklad...');
    const diagnostics = await axios.get(`${API_BASE}/diagnostics`);
    console.log('✅ Diagnostics:', {
      success: diagnostics.data.success,
      productsCount: diagnostics.data.productsCount,
      categoriesCount: diagnostics.data.categoriesCount
    });
    
    // 3. Загрузка категорий
    console.log('\n3. Загрузка категорий...');
    const categories = await axios.get(`${API_BASE}/categories`);
    console.log(`✅ Categories loaded: ${categories.data.length} categories`);
    console.log('First 3 categories:', categories.data.slice(0, 3).map(c => c.name));
    
    // 4. Загрузка товаров (первая страница)
    console.log('\n4. Загрузка товаров (первая страница)...');
    const products = await axios.get(`${API_BASE}/products?page=1&limit=10`);
    console.log(`✅ Products loaded: ${products.data.products.length} products from ${products.data.total} total`);
    console.log('First product:', products.data.products[0]?.name || 'No products');
    
    // 5. Статистика
    console.log('\n5. Статистика каталога...');
    const stats = await axios.get(`${API_BASE}/stats`);
    console.log('✅ Stats:', stats.data);
    
    console.log('\n🎉 Все тесты прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Запускаем тест
testAPI(); 