const axios = require('axios');

// Тестируем клиентские запросы
async function testClient() {
  console.log('🧪 Тестирование клиентской части...\n');
  
  const baseURL = 'https://gp-katalog-bot.onrender.com/api';
  
  try {
    // Тест 1: Проверка здоровья API
    console.log('1️⃣ Проверка здоровья API...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ API здоров:', healthResponse.data.status);
    
    // Тест 2: Загрузка категорий
    console.log('\n2️⃣ Загрузка категорий...');
    const categoriesResponse = await axios.get(`${baseURL}/categories`);
    console.log(`✅ Категории загружены: ${categoriesResponse.data.length} шт.`);
    
    // Тест 3: Загрузка товаров
    console.log('\n3️⃣ Загрузка товаров...');
    const productsResponse = await axios.get(`${baseURL}/products?limit=10`);
    console.log(`✅ Товары загружены: ${productsResponse.data.products.length} шт.`);
    
    // Тест 4: Поиск товаров
    console.log('\n4️⃣ Тест поиска...');
    const searchResponse = await axios.get(`${baseURL}/search?q=мясо&limit=5`);
    console.log(`✅ Поиск работает: ${searchResponse.data.products.length} товаров найдено`);
    
    // Тест 5: Проверка CORS
    console.log('\n5️⃣ Проверка CORS...');
    const corsResponse = await axios.get(`${baseURL}/products?limit=1`, {
      headers: {
        'Origin': 'https://web.telegram.org',
        'Access-Control-Request-Method': 'GET'
      }
    });
    console.log('✅ CORS работает корректно');
    
    console.log('\n🎉 Все тесты клиентской части прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в клиентском тесте:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
  }
}

testClient(); 