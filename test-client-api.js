const axios = require('axios');

// Тестируем API так же, как это делает клиент
const API_URL = 'https://gp-katalog-bot.onrender.com/api';

async function testClientAPI() {
  console.log('🚀 Тестируем API для клиента...');
  
  try {
    // Тест категорий (как в клиенте)
    console.log('\n1. Тестируем /categories...');
    const categoriesResponse = await axios.get(`${API_URL}/categories`, { 
      timeout: 30000 
    });
    console.log(`✅ Categories: ${categoriesResponse.status}`);
    console.log(`   Count: ${categoriesResponse.data.length || 0} categories`);
    
    if (categoriesResponse.data.length > 0) {
      console.log(`   First category:`, {
        id: categoriesResponse.data[0].id,
        name: categoriesResponse.data[0].name,
        productCount: categoriesResponse.data[0].productCount
      });
    }
    
  } catch (error) {
    console.log(`❌ Categories failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
  }
  
  try {
    // Тест товаров (как в клиенте)
    console.log('\n2. Тестируем /products?page=1&limit=200...');
    const productsResponse = await axios.get(`${API_URL}/products?page=1&limit=200`, { 
      timeout: 30000 
    });
    console.log(`✅ Products: ${productsResponse.status}`);
    console.log(`   Count: ${productsResponse.data.products?.length || 0} products`);
    console.log(`   Has more: ${productsResponse.data.hasMore}`);
    
    if (productsResponse.data.products && productsResponse.data.products.length > 0) {
      console.log(`   First product:`, {
        id: productsResponse.data.products[0].id,
        name: productsResponse.data.products[0].name,
        price: productsResponse.data.products[0].price,
        categoryId: productsResponse.data.products[0].categoryId
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

testClientAPI().catch(console.error); 