const axios = require('axios');
require('dotenv').config();

class MoyskladStructureAnalyzer {
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

  async analyzeStructure() {
    console.log('🔍 Анализируем структуру данных МойСклад...\n');

    try {
      // 1. Получаем все категории
      console.log('📁 Получаем категории...');
      const categoriesResponse = await this.client.get('/entity/productfolder');
      const categories = categoriesResponse.data.rows;
      console.log(`✅ Найдено ${categories.length} категорий\n`);

      // 2. Получаем все товары
      console.log('📦 Получаем товары...');
      const productsResponse = await this.client.get('/entity/product?limit=1000');
      const products = productsResponse.data.rows;
      console.log(`✅ Найдено ${products.length} товаров\n`);

      // 3. Анализируем структуру категорий
      console.log('📊 Анализ структуры категорий:');
      categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category.name}`);
        console.log(`   ID: ${category.id}`);
        console.log(`   Путь: ${category.pathName || 'Нет пути'}`);
        console.log(`   Описание: ${category.description || 'Нет описания'}`);
        if (category.productFolder) {
          console.log(`   Родительская категория: ${category.productFolder.meta.href}`);
        }
        console.log('');
      });

      // 4. Анализируем связь товаров с категориями
      console.log('🔗 Анализ связи товаров с категориями:');
      const categoryProductMap = {};
      const uncategorizedProducts = [];

      products.forEach(product => {
        if (product.productFolder) {
          const categoryId = product.productFolder.meta.href.split('/').pop();
          if (!categoryProductMap[categoryId]) {
            categoryProductMap[categoryId] = [];
          }
          categoryProductMap[categoryId].push(product);
        } else {
          uncategorizedProducts.push(product);
        }
      });

      console.log(`📈 Товары по категориям:`);
      Object.keys(categoryProductMap).forEach(categoryId => {
        const category = categories.find(c => c.id === categoryId);
        const categoryName = category ? category.name : `Категория ${categoryId}`;
        console.log(`   ${categoryName}: ${categoryProductMap[categoryId].length} товаров`);
      });

      if (uncategorizedProducts.length > 0) {
        console.log(`   Без категории: ${uncategorizedProducts.length} товаров`);
      }

      // 5. Показываем примеры товаров
      console.log('\n📋 Примеры товаров:');
      products.slice(0, 5).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Код: ${product.code || 'Нет кода'}`);
        console.log(`   Категория: ${product.productFolder ? product.productFolder.meta.href.split('/').pop() : 'Нет категории'}`);
        console.log(`   Цена: ${product.salePrices && product.salePrices[0] ? product.salePrices[0].value / 100 : 'Нет цены'} руб.`);
        console.log('');
      });

      // 6. Анализируем иерархию категорий
      console.log('🌳 Анализ иерархии категорий:');
      const categoryHierarchy = this.buildCategoryHierarchy(categories);
      this.printCategoryHierarchy(categoryHierarchy);

      return {
        categories,
        products,
        categoryProductMap,
        uncategorizedProducts,
        categoryHierarchy
      };

    } catch (error) {
      console.error('❌ Ошибка при анализе структуры:', error.message);
      if (error.response) {
        console.error('Статус:', error.response.status);
        console.error('Данные:', error.response.data);
      }
      throw error;
    }
  }

  buildCategoryHierarchy(categories) {
    const categoryMap = {};
    const rootCategories = [];

    // Создаем карту категорий
    categories.forEach(category => {
      categoryMap[category.id] = {
        ...category,
        children: []
      };
    });

    // Строим иерархию
    categories.forEach(category => {
      if (category.productFolder) {
        const parentId = category.productFolder.meta.href.split('/').pop();
        if (categoryMap[parentId]) {
          categoryMap[parentId].children.push(categoryMap[category.id]);
        }
      } else {
        rootCategories.push(categoryMap[category.id]);
      }
    });

    return rootCategories;
  }

  printCategoryHierarchy(categories, level = 0) {
    categories.forEach(category => {
      const indent = '  '.repeat(level);
      console.log(`${indent}${level === 0 ? '📁' : '  └─'} ${category.name} (${category.id})`);
      
      if (category.children && category.children.length > 0) {
        this.printCategoryHierarchy(category.children, level + 1);
      }
    });
  }
}

// Запуск анализа
async function main() {
  const analyzer = new MoyskladStructureAnalyzer();
  
  try {
    await analyzer.analyzeStructure();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MoyskladStructureAnalyzer; 