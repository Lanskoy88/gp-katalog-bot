const axios = require('axios');

// Тестируем разные URL
const urls = [
  'https://gp-katalog-bot.onrender.com/api',
  'https://gp-katalog-images.loca.lt/api',
  'http://localhost:3000/api'
];

async function testAPI(url) {
  console.log(`\n🔍 Тестируем: ${url}`);
  
  try {
    // Тест здоровья API
    const healthResponse = await axios.get(`${url}/health`, { timeout: 5000 });
    console.log(`✅ Health check: ${healthResponse.status}`);
    
    // Тест категорий
    const categoriesResponse = await axios.get(`${url}/categories`, { timeout: 10000 });
    console.log(`✅ Categories: ${categoriesResponse.status} - ${categoriesResponse.data.length || 0} categories`);
    
    // Тест товаров
    const productsResponse = await axios.get(`${url}/products?page=1&limit=10`, { timeout: 10000 });
    console.log(`✅ Products: ${productsResponse.status} - ${productsResponse.data.length || 0} products`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    }
  }
}

async function runTests() {
  console.log('🚀 Начинаем тестирование API endpoints...');
  
  for (const url of urls) {
    await testAPI(url);
  }
  
  console.log('\n✅ Тестирование завершено');
}

runTests().catch(console.error); 