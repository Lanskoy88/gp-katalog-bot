const axios = require('axios');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryRequest(fn, maxRetries = 3, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`   ⏳ Повторная попытка ${i + 1}/${maxRetries} через ${delay}ms...`);
      await sleep(delay);
    }
  }
}

async function testProduction() {
  const PROD_URL = 'https://gp-katalog-bot.onrender.com';
  
  console.log('🚀 ФИНАЛЬНЫЙ ТЕСТ ПРОДАКШЕНА');
  console.log('=' .repeat(50));
  console.log(`URL: ${PROD_URL}`);
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}`);
  console.log('');
  
  const results = {
    health: false,
    products: false,
    categories: false,
    search: false,
    pagination: false,
    stats: false
  };
  
  try {
    // 1. Health Check
    console.log('1️⃣ Проверка здоровья сервера...');
    try {
      const health = await retryRequest(() => 
        axios.get(`${PROD_URL}/health`, { timeout: 15000 })
      );
      console.log(`   ✅ Статус: ${health.data.status}`);
      console.log(`   🤖 Бот: ${health.data.botStatus}`);
      console.log(`   🌍 Окружение: ${health.data.environment}`);
      results.health = true;
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
    
    // 2. Загрузка товаров (с меньшим лимитом)
    console.log('\n2️⃣ Загрузка товаров...');
    try {
      const products = await retryRequest(() => 
        axios.get(`${PROD_URL}/api/products?page=1&limit=20`, { timeout: 45000 })
      );
      console.log(`   ✅ Загружено: ${products.data.products.length} товаров`);
      console.log(`   📊 Всего товаров: ${products.data.total}`);
      console.log(`   🔄 Пагинация: ${products.data.hasMore ? 'Есть еще' : 'Все загружены'}`);
      
      if (products.data.products.length > 0) {
        console.log(`   📦 Пример товара: ${products.data.products[0].name}`);
      }
      results.products = true;
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
    
    // 3. Загрузка категорий
    console.log('\n3️⃣ Загрузка категорий...');
    try {
      const categories = await retryRequest(() => 
        axios.get(`${PROD_URL}/api/categories`, { timeout: 30000 })
      );
      console.log(`   ✅ Загружено: ${categories.data.length} категорий`);
      
      if (categories.data.length > 0) {
        const categoriesWithProducts = categories.data.filter(cat => cat.productCount > 0);
        console.log(`   📂 Категории с товарами: ${categoriesWithProducts.length}`);
        console.log(`   📂 Пример: ${categories.data[0].name} (${categories.data[0].productCount} товаров)`);
      }
      results.categories = true;
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
    
    // 4. Поиск товаров
    console.log('\n4️⃣ Тест поиска...');
    try {
      const search = await retryRequest(() => 
        axios.get(`${PROD_URL}/api/search?q=мясо&limit=5`, { timeout: 25000 })
      );
      console.log(`   ✅ Найдено: ${search.data.products.length} товаров`);
      console.log(`   📊 Всего результатов: ${search.data.total}`);
      
      if (search.data.products.length > 0) {
        console.log(`   🔍 Пример: ${search.data.products[0].name}`);
      }
      results.search = true;
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
    
    // 5. Тест пагинации
    console.log('\n5️⃣ Тест пагинации...');
    try {
      const page2 = await retryRequest(() => 
        axios.get(`${PROD_URL}/api/products?page=2&limit=10`, { timeout: 25000 })
      );
      console.log(`   ✅ Страница 2: ${page2.data.products.length} товаров`);
      console.log(`   📊 Всего товаров: ${page2.data.total}`);
      console.log(`   🔄 Есть еще: ${page2.data.hasMore}`);
      results.pagination = true;
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
    
    // 6. Статистика
    console.log('\n6️⃣ Статистика каталога...');
    try {
      const stats = await retryRequest(() => 
        axios.get(`${PROD_URL}/api/stats`, { timeout: 25000 })
      );
      console.log(`   ✅ Всего категорий: ${stats.data.allCategoriesCount}`);
      console.log(`   👁️ Видимых категорий: ${stats.data.visibleCategoriesCount}`);
      console.log(`   📦 Всего товаров: ${stats.data.productsCount}`);
      console.log(`   💬 Статус: ${stats.data.message}`);
      results.stats = true;
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
    
    // Итоговый результат
    console.log('\n' + '=' .repeat(50));
    console.log('📊 ИТОГОВЫЙ РЕЗУЛЬТАТ:');
    console.log('=' .repeat(50));
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log(`✅ Успешно: ${passed}/${total}`);
    console.log(`📈 Процент успеха: ${Math.round((passed / total) * 100)}%`);
    
    if (passed >= 4) {
      console.log('\n🎉 ПРОДАКШЕН ГОТОВ! Основные функции работают!');
      console.log('🚀 Каталог функционален в продакшене');
    } else if (passed >= 2) {
      console.log('\n⚠️ Частично работает, есть проблемы с производительностью');
    } else {
      console.log('\n❌ Критические проблемы в продакшене');
    }
    
    console.log('\n🔗 Ссылки:');
    console.log(`   🌐 Каталог: ${PROD_URL}`);
    console.log(`   📱 Telegram Bot: @gp_katalog_bot`);
    console.log(`   📊 API: ${PROD_URL}/api`);
    
    // Дополнительная информация
    console.log('\n💡 Примечания:');
    console.log('   • Render может быть медленным при "холодном" старте');
    console.log('   • Первые запросы могут занимать до 30-60 секунд');
    console.log('   • Последующие запросы работают быстрее');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
  }
}

// Увеличиваем таймауты для продакшена
axios.defaults.timeout = 60000;

testProduction(); 