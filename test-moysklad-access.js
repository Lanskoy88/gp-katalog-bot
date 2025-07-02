const axios = require('axios');

// Тестируем прямой доступ к MoySklad API
const MOYSKLAD_BASE = 'https://api.moysklad.ru/api/remap/1.2';
const API_TOKEN = process.env.MOYSKLAD_API_TOKEN;

async function testMoyskladAccess() {
  console.log('🧪 Тестирование прямого доступа к MoySklad API...\n');
  
  if (!API_TOKEN) {
    console.error('❌ MOYSKLAD_API_TOKEN не установлен');
    return;
  }
  
  const client = axios.create({
    baseURL: MOYSKLAD_BASE,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Accept': 'application/json;charset=utf-8',
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  try {
    // 1. Тест подключения
    console.log('1. Тест подключения...');
    const testResponse = await client.get('/entity/product?limit=1');
    console.log('✅ Подключение работает');
    console.log('   Всего товаров:', testResponse.data.meta?.size || 0);
    
    // 2. Тест получения товаров
    console.log('\n2. Тест получения товаров...');
    const productsResponse = await client.get('/entity/product?limit=5');
    console.log('✅ Товары загружены');
    console.log('   Получено товаров:', productsResponse.data.rows?.length || 0);
    if (productsResponse.data.rows && productsResponse.data.rows.length > 0) {
      const product = productsResponse.data.rows[0];
      console.log('   Первый товар:', {
        id: product.id,
        name: product.name,
        productFolder: product.productFolder ? {
          id: product.productFolder.id,
          name: product.productFolder.name
        } : 'Нет категории'
      });
    }
    
    // 3. Тест получения категорий
    console.log('\n3. Тест получения категорий...');
    try {
      const categoriesResponse = await client.get('/entity/productfolder?limit=5');
      console.log('✅ Категории загружены');
      console.log('   Получено категорий:', categoriesResponse.data.rows?.length || 0);
      if (categoriesResponse.data.rows && categoriesResponse.data.rows.length > 0) {
        const category = categoriesResponse.data.rows[0];
        console.log('   Первая категория:', {
          id: category.id,
          name: category.name,
          pathName: category.pathName
        });
      }
    } catch (error) {
      console.log('❌ Ошибка при получении категорий:', error.response?.status, error.response?.data?.errors?.[0]?.error || error.message);
    }
    
    // 4. Тест получения товаров по категории
    console.log('\n4. Тест получения товаров по категории...');
    if (productsResponse.data.rows && productsResponse.data.rows.length > 0) {
      const product = productsResponse.data.rows[0];
      if (product.productFolder) {
        try {
          const categoryProductsResponse = await client.get(`/entity/product?filter=productFolder.id=${product.productFolder.id}&limit=3`);
          console.log('✅ Товары по категории загружены');
          console.log('   Товаров в категории:', categoryProductsResponse.data.meta?.size || 0);
        } catch (error) {
          console.log('❌ Ошибка при получении товаров по категории:', error.response?.status, error.message);
        }
      } else {
        console.log('⚠️ У первого товара нет категории');
      }
    }
    
    console.log('\n🎉 Тестирование завершено');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Запускаем тест
testMoyskladAccess(); 