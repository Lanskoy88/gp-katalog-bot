const axios = require('axios');

const RENDER_URL = 'https://gp-katalog-bot.onrender.com/api';

async function testRenderAPI() {
  console.log('🚀 Тестируем Render API...');
  
  try {
    // Тест здоровья API
    console.log('\n1. Тестируем health endpoint...');
    const healthResponse = await axios.get(`${RENDER_URL}/health`, { 
      timeout: 10000 
    });
    console.log(`✅ Health check: ${healthResponse.status}`);
    console.log(`   Response:`, healthResponse.data);
    
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return;
  }
  
  try {
    // Тест категорий
    console.log('\n2. Тестируем categories endpoint...');
    const categoriesResponse = await axios.get(`${RENDER_URL}/categories`, { 
      timeout: 30000 
    });
    console.log(`✅ Categories: ${categoriesResponse.status}`);
    console.log(`   Count: ${categoriesResponse.data.length || 0} categories`);
    if (categoriesResponse.data.length > 0) {
      console.log(`   First category:`, categoriesResponse.data[0]);
    }
    
  } catch (error) {
    console.log(`❌ Categories failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
  }
  
  try {
    // Тест товаров
    console.log('\n3. Тестируем products endpoint...');
    const productsResponse = await axios.get(`${RENDER_URL}/products?page=1&limit=5`, { 
      timeout: 30000 
    });
    console.log(`✅ Products: ${productsResponse.status}`);
    console.log(`   Count: ${productsResponse.data.length || 0} products`);
    if (productsResponse.data.length > 0) {
      console.log(`   First product:`, {
        id: productsResponse.data[0].id,
        name: productsResponse.data[0].name,
        price: productsResponse.data[0].price
      });
    }
    
  } catch (error) {
    console.log(`❌ Products failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
  }
  
  console.log('\n✅ Тестирование завершено');
}

testRenderAPI().catch(console.error); 