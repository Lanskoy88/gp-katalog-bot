const axios = require('axios');

async function testDirectAPI() {
  console.log('Testing direct API access...');
  
  const apiToken = '876311c15447994f9f5d11e90112c482026fd6bb';
  const baseURL = 'https://api.moysklad.ru/api/remap/1.2';
  
  const client = axios.create({
    baseURL: baseURL,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json;charset=utf-8',
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  try {
    // Тест 1: Получаем общее количество товаров
    console.log('\n1. Testing products count...');
    const productsCountResponse = await client.get('/entity/product?limit=1');
    console.log('Products count response:', productsCountResponse.data);
    
    // Тест 2: Получаем первые 5 товаров
    console.log('\n2. Testing first 5 products...');
    const productsResponse = await client.get('/entity/product?limit=5');
    console.log('Products response meta:', productsResponse.data.meta);
    console.log('Products count:', productsResponse.data.rows ? productsResponse.data.rows.length : 0);
    
    if (productsResponse.data.rows && productsResponse.data.rows.length > 0) {
      console.log('First product:', {
        id: productsResponse.data.rows[0].id,
        name: productsResponse.data.rows[0].name,
        code: productsResponse.data.rows[0].code,
        productFolder: productsResponse.data.rows[0].productFolder
      });
    }
    
    // Тест 3: Получаем категории
    console.log('\n3. Testing categories...');
    const categoriesResponse = await client.get('/entity/productfolder?limit=5');
    console.log('Categories count:', categoriesResponse.data.rows ? categoriesResponse.data.rows.length : 0);
    
    if (categoriesResponse.data.rows && categoriesResponse.data.rows.length > 0) {
      console.log('First category:', {
        id: categoriesResponse.data.rows[0].id,
        name: categoriesResponse.data.rows[0].name
      });
    }
    
  } catch (error) {
    console.error('Error:', error.response ? {
      status: error.response.status,
      data: error.response.data
    } : error.message);
  }
}

testDirectAPI(); 