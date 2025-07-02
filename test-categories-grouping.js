const axios = require('axios');

const API_BASE = 'https://gp-katalog-bot.onrender.com/api';

async function testCategoriesAndGrouping() {
  console.log('🧪 Тестируем загрузку категорий и группировку товаров...\n');

  try {
    // Тест 1: Загрузка категорий
    console.log('📂 Загрузка категорий:');
    const startTime1 = Date.now();
    const categoriesResponse = await axios.get(`${API_BASE}/categories`);
    const endTime1 = Date.now();
    
    const categories = categoriesResponse.data || [];
    console.log(`✅ Загружено: ${categories.length} категорий`);
    console.log(`⏱️  Время загрузки: ${endTime1 - startTime1}ms`);
    
    // Показываем первые 5 категорий
    console.log('\n📋 Первые 5 категорий:');
    categories.slice(0, 5).forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.productCount} товаров)`);
    });
    
    // Тест 2: Загрузка товаров с группировкой
    console.log('\n📦 Загрузка товаров для группировки:');
    const startTime2 = Date.now();
    const productsResponse = await axios.get(`${API_BASE}/products?page=1&limit=100`);
    const endTime2 = Date.now();
    
    const products = productsResponse.data.products || [];
    console.log(`✅ Загружено: ${products.length} товаров`);
    console.log(`⏱️  Время загрузки: ${endTime2 - startTime2}ms`);
    console.log(`📊 Всего товаров: ${productsResponse.data.total || 'неизвестно'}`);
    
    // Группировка товаров по категориям
    const groups = {};
    const uncategorized = [];
    
    products.forEach(product => {
      if (product.categoryId && product.categoryName) {
        if (!groups[product.categoryId]) {
          groups[product.categoryId] = {
            id: product.categoryId,
            name: product.categoryName,
            products: []
          };
        }
        groups[product.categoryId].products.push(product);
      } else {
        uncategorized.push(product);
      }
    });
    
    // Добавляем товары без категории
    if (uncategorized.length > 0) {
      groups['uncategorized'] = {
        id: 'uncategorized',
        name: 'Без категории',
        products: uncategorized
      };
    }
    
    const groupedCategories = Object.values(groups);
    
    console.log(`\n📂 Группировка товаров:`);
    console.log(`✅ Создано ${groupedCategories.length} групп`);
    
    // Показываем группы с количеством товаров
    groupedCategories.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name}: ${group.products.length} товаров`);
    });
    
    // Тест 3: Поиск товаров
    console.log('\n🔍 Тестируем поиск:');
    const startTime3 = Date.now();
    const searchResponse = await axios.get(`${API_BASE}/products?search=говядина&page=1&limit=20`);
    const endTime3 = Date.now();
    
    const searchProducts = searchResponse.data.products || [];
    console.log(`✅ Найдено: ${searchProducts.length} товаров по запросу "говядина"`);
    console.log(`⏱️  Время поиска: ${endTime3 - startTime3}ms`);
    
    if (searchProducts.length > 0) {
      console.log('\n📋 Примеры найденных товаров:');
      searchProducts.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.categoryName || 'Без категории'})`);
      });
    }
    
    console.log('\n🎉 Тестирование завершено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
  }
}

testCategoriesAndGrouping(); 