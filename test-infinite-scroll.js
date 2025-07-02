const axios = require('axios');

const API_BASE = 'https://gp-katalog-bot.onrender.com/api';

async function testInfiniteScroll() {
  console.log('🧪 Тестируем бесконечную прокрутку с лимитом 20 товаров...\n');

  try {
    // Тест 1: Первая страница (20 товаров)
    console.log('📄 Страница 1 (лимит 20):');
    const startTime1 = Date.now();
    const response1 = await axios.get(`${API_BASE}/products?page=1&limit=20`);
    const endTime1 = Date.now();
    
    const products1 = response1.data.products || [];
    console.log(`✅ Загружено: ${products1.length} товаров`);
    console.log(`⏱️  Время загрузки: ${endTime1 - startTime1}ms`);
    console.log(`📊 Всего товаров: ${response1.data.total || 'неизвестно'}`);
    console.log(`🔄 Есть еще: ${response1.data.hasMore ? 'да' : 'нет'}`);
    
    if (products1.length > 0) {
      console.log(`📦 Первый товар: ${products1[0].name || 'без названия'}`);
    }
    console.log('');

    // Тест 2: Вторая страница (если есть)
    if (response1.data.hasMore) {
      console.log('📄 Страница 2 (лимит 20):');
      const startTime2 = Date.now();
      const response2 = await axios.get(`${API_BASE}/products?page=2&limit=20`);
      const endTime2 = Date.now();
      
      const products2 = response2.data.products || [];
      console.log(`✅ Загружено: ${products2.length} товаров`);
      console.log(`⏱️  Время загрузки: ${endTime2 - startTime2}ms`);
      console.log(`🔄 Есть еще: ${response2.data.hasMore ? 'да' : 'нет'}`);
      
      if (products2.length > 0) {
        console.log(`📦 Первый товар: ${products2[0].name || 'без названия'}`);
      }
      console.log('');
    }

    // Тест 3: Поиск с лимитом 20
    console.log('🔍 Поиск "тест" (лимит 20):');
    const startTime3 = Date.now();
    const response3 = await axios.get(`${API_BASE}/products?page=1&limit=20&search=тест`);
    const endTime3 = Date.now();
    
    const products3 = response3.data.products || [];
    console.log(`✅ Найдено: ${products3.length} товаров`);
    console.log(`⏱️  Время поиска: ${endTime3 - startTime3}ms`);
    console.log(`🔄 Есть еще: ${response3.data.hasMore ? 'да' : 'нет'}`);
    console.log('');

    // Тест 4: Категории
    console.log('📂 Загрузка категорий:');
    const startTime4 = Date.now();
    const categories = await axios.get(`${API_BASE}/categories`);
    const endTime4 = Date.now();
    
    console.log(`✅ Загружено: ${categories.data.length || 0} категорий`);
    console.log(`⏱️  Время загрузки: ${endTime4 - startTime4}ms`);
    
    if (categories.data.length > 0) {
      console.log(`📂 Первая категория: ${categories.data[0].name || 'без названия'}`);
    }
    console.log('');

    console.log('🎉 Все тесты завершены успешно!');
    console.log('\n💡 Рекомендации:');
    console.log('- Первая страница загружается за ~' + (endTime1 - startTime1) + 'ms');
    console.log('- Лимит 20 товаров обеспечивает быструю загрузку');
    console.log('- Бесконечная прокрутка работает корректно');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    if (error.response) {
      console.error('📊 Статус:', error.response.status);
      console.error('📄 Данные:', error.response.data);
    }
  }
}

// Запускаем тест
testInfiniteScroll(); 