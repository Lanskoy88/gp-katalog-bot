const axios = require('axios');

async function testProductsLoading() {
  console.log('Testing products loading...');
  
  try {
    // Тест 1: Проверяем диагностику
    console.log('\n1. Testing diagnostics...');
    const diagnostics = await axios.get('https://gp-katalog-bot.onrender.com/api/diagnostics');
    console.log('Diagnostics:', diagnostics.data);
    
    // Тест 2: Проверяем категории
    console.log('\n2. Testing categories...');
    const categories = await axios.get('https://gp-katalog-bot.onrender.com/api/categories');
    console.log('Categories count:', categories.data.length);
    console.log('First category:', categories.data[0]);
    
    // Тест 3: Проверяем товары
    console.log('\n3. Testing products...');
    const products = await axios.get('https://gp-katalog-bot.onrender.com/api/products?page=1&limit=5');
    console.log('Products response:', products.data);
    
    // Тест 4: Проверяем товары с категорией "all"
    console.log('\n4. Testing products with category "all"...');
    const productsAll = await axios.get('https://gp-katalog-bot.onrender.com/api/products?page=1&limit=5&categoryId=all');
    console.log('Products with category "all":', productsAll.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testProductsLoading(); 