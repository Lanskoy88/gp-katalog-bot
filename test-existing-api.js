const axios = require('axios');
require('dotenv').config();

class ExistingApiTester {
  constructor() {
    this.baseURL = 'https://api.moysklad.ru/api/remap/1.2';
    this.apiToken = process.env.MOYSKLAD_API_TOKEN;
    this.accountId = process.env.MOYSKLAD_ACCOUNT_ID;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Accept': 'application/json;charset=utf-8',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  async testAvailableEndpoints() {
    console.log('🔍 Тестируем доступные эндпоинты МойСклад...\n');

    const endpoints = [
      '/entity/product',
      '/entity/productfolder',
      '/entity/assortment',
      '/entity/good',
      '/entity/service',
      '/entity/bundle',
      '/entity/variant',
      '/entity/consignment',
      '/entity/slot',
      '/entity/enter',
      '/entity/store',
      '/entity/warehouse'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Тестируем ${endpoint}...`);
        const response = await this.client.get(`${endpoint}?limit=1`);
        console.log(`✅ ${endpoint} - доступен (${response.data.meta && response.data.meta.size ? response.data.meta.size : 0} записей)`);
              } catch (error) {
          if (error.response && error.response.status === 403) {
            console.log(`❌ ${endpoint} - нет доступа (403)`);
          } else if (error.response && error.response.status === 404) {
            console.log(`❌ ${endpoint} - не найден (404)`);
          } else {
            console.log(`❌ ${endpoint} - ошибка ${error.response && error.response.status ? error.response.status : error.message}`);
          }
        }
    }
  }

  async analyzeProducts() {
    console.log('\n📦 Анализируем структуру товаров...\n');

    try {
      // Получаем товары
      const response = await this.client.get('/entity/product?limit=50');
      const products = response.data.rows;
      
      console.log(`✅ Получено ${products.length} товаров из ${response.data.meta.size} всего\n`);

      // Анализируем структуру первого товара
      if (products.length > 0) {
        console.log('📋 Структура товара:');
        const product = products[0];
        console.log(JSON.stringify(product, null, 2));
        
        // Анализируем категории товаров
        console.log('\n🔗 Анализ категорий товаров:');
        const categoryMap = {};
        const uncategorized = [];

        products.forEach(product => {
          if (product.productFolder) {
            const categoryId = product.productFolder.meta.href.split('/').pop();
            const categoryName = product.productFolder.name || `Категория ${categoryId}`;
            
            if (!categoryMap[categoryId]) {
              categoryMap[categoryId] = {
                id: categoryId,
                name: categoryName,
                products: []
              };
            }
            categoryMap[categoryId].products.push(product);
          } else {
            uncategorized.push(product);
          }
        });

        console.log('📈 Товары по категориям:');
        Object.values(categoryMap).forEach(category => {
          console.log(`   ${category.name}: ${category.products.length} товаров`);
        });

        if (uncategorized.length > 0) {
          console.log(`   Без категории: ${uncategorized.length} товаров`);
        }

        // Показываем примеры товаров с категориями
        console.log('\n📋 Примеры товаров:');
        products.slice(0, 10).forEach((product, index) => {
          const categoryName = product.productFolder ? product.productFolder.name : 'Без категории';
          const price = product.salePrices && product.salePrices[0] ? product.salePrices[0].value / 100 : 'Нет цены';
          console.log(`${index + 1}. ${product.name} (${categoryName}) - ${price} руб.`);
        });
      }

    } catch (error) {
      console.error('❌ Ошибка при анализе товаров:', error.message);
      if (error.response) {
        console.error('Статус:', error.response.status);
        console.error('Данные:', error.response.data);
      }
    }
  }

  async testProductFolderAccess() {
    console.log('\n📁 Тестируем доступ к папкам товаров...\n');

    try {
      // Пробуем получить папки товаров через assortment
      const response = await this.client.get('/entity/assortment?filter=meta.type=productfolder&limit=10');
      console.log('✅ Получены папки товаров через assortment:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Не удалось получить папки через assortment:', error.message);
    }
  }
}

// Запуск тестов
async function main() {
  const tester = new ExistingApiTester();
  
  try {
    await tester.testAvailableEndpoints();
    await tester.analyzeProducts();
    await tester.testProductFolderAccess();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ExistingApiTester; 