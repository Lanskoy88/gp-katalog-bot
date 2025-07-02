const axios = require('axios');

const API_URL = 'https://gp-katalog-bot.onrender.com/api';

async function testOptimizedAPI() {
  console.log('🚀 Тестируем оптимизированный API...');
  
  try {
    // Тест категорий
    console.log('\n1. Тестируем /categories...');
    const startTime = Date.now();
    const categoriesResponse = await axios.get(`${API_URL}/categories`, { 
      timeout: 30000 
    });
    const categoriesTime = Date.now() - startTime;
    
    console.log(`✅ Categories: ${categoriesResponse.status} (${categoriesTime}ms)`);
    console.log(`   Count: ${categoriesResponse.data.length || 0} categories`);
    
  } catch (error) {
    console.log(`❌ Categories failed: ${error.message}`);
  }
  
  try {
    // Тест товаров с меньшим лимитом
    console.log('\n2. Тестируем /products?page=1&limit=50...');
    const startTime = Date.now();
    const productsResponse = await axios.get(`${API_URL}/products?page=1&limit=50`, { 
      timeout: 30000 
    });
    const productsTime = Date.now() - startTime;
    
    console.log(`✅ Products: ${productsResponse.status} (${productsTime}ms)`);
    console.log(`   Count: ${(productsResponse.data.products && productsResponse.data.products.length) || 0} products`);
    console.log(`   Has more: ${productsResponse.data.hasMore}`);
    
    if (productsResponse.data.products && productsResponse.data.products.length > 0) {
      console.log(`   First product:`, {
        id: productsResponse.data.products[0].id,
        name: productsResponse.data.products[0].name,
        price: productsResponse.data.products[0].price
      });
    }
    
  } catch (error) {
    console.log(`❌ Products failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
  }
  
  try {
    // Тест второй страницы
    console.log('\n3. Тестируем /products?page=2&limit=50...');
    const startTime = Date.now();
    const productsPage2Response = await axios.get(`${API_URL}/products?page=2&limit=50`, { 
      timeout: 30000 
    });
    const productsPage2Time = Date.now() - startTime;
    
    console.log(`✅ Products page 2: ${productsPage2Response.status} (${productsPage2Time}ms)`);
    console.log(`   Count: ${(productsPage2Response.data.products && productsPage2Response.data.products.length) || 0} products`);
    console.log(`   Has more: ${productsPage2Response.data.hasMore}`);
    
  } catch (error) {
    console.log(`❌ Products page 2 failed: ${error.message}`);
  }
  
  console.log('\n✅ Тестирование завершено');
}

testOptimizedAPI().catch(console.error); 