const MoyskladService = require('./server/services/moyskladService');

async function testGetProducts() {
  console.log('Testing getProducts function directly...');
  
  const service = new MoyskladService();
  
  try {
    // Тест 1: Проверяем диагностику
    console.log('\n1. Testing diagnostics...');
    const diagnostics = await service.testConnection();
    console.log('Diagnostics:', diagnostics);
    
    // Тест 2: Проверяем getProducts напрямую
    console.log('\n2. Testing getProducts directly...');
    const products = await service.getProducts(1, 5);
    console.log('getProducts result:', products);
    
    // Тест 3: Проверяем getProductsWithImages
    console.log('\n3. Testing getProductsWithImages...');
    const productsWithImages = await service.getProductsWithImages(1, 5);
    console.log('getProductsWithImages result:', productsWithImages);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testGetProducts(); 