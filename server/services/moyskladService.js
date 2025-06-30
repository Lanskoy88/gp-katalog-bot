const axios = require('axios');
const fs = require('fs');
const path = require('path');

// In-memory кэш изображений (на уровне модуля)
const imageCache = new Map();

// Путь к файлу с настройками категорий
const CATEGORY_SETTINGS_FILE = path.join(__dirname, '../data/category-settings.json');

class MoyskladService {
  constructor() {
    this.baseURL = 'https://api.moysklad.ru/api/remap/1.2';
    this.apiToken = process.env.MOYSKLAD_API_TOKEN;
    this.accountId = process.env.MOYSKLAD_ACCOUNT_ID;
    
    // Создаем директорию для данных если её нет
    this.ensureDataDirectory();
  }

  // Создание директории для данных
  ensureDataDirectory() {
    const dataDir = path.dirname(CATEGORY_SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  // Загрузка настроек категорий из файла
  loadCategorySettings() {
    try {
      const settingsFile = path.join(__dirname, '../data/category-settings.json');
      if (fs.existsSync(settingsFile)) {
        const data = fs.readFileSync(settingsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading category settings:', error.message);
    }
    return {};
  }

  // Сохранение настроек категорий в файл
  saveCategorySettings(settings) {
    try {
      const settingsFile = path.join(__dirname, '../data/category-settings.json');
      const dataDir = path.dirname(settingsFile);
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving category settings:', error.message);
      return false;
    }
  }

  // Создание авторизованного клиента
  createAuthenticatedClient() {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Accept': 'application/json;charset=utf-8',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  // Получение товаров с пагинацией
  async getProducts(page = 1, limit = 20, categoryId = null, search = null) {
    try {
      const client = this.createAuthenticatedClient();
      
      let url = `/entity/product?limit=${limit}&offset=${(page - 1) * limit}`;
      
      // Фильтрация по категории (если указана)
      if (categoryId) {
        url += `&filter=productFolder.id=${categoryId}`;
      }
      
      // Поиск по названию (если есть)
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      console.log('Requesting URL:', url);
      const response = await client.get(url);
      
      return {
        products: response.data.rows,
        total: response.data.meta.size,
        hasMore: response.data.rows.length === limit
      };
    } catch (error) {
      console.error('Error getting products:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  // Получение всех категорий товаров (только видимые)
  async getCategories() {
    try {
      const client = this.createAuthenticatedClient();
      const response = await client.get('/entity/productfolder');
      
      // Обрабатываем категории для более удобного использования
      const allCategories = response.data.rows.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        pathName: category.pathName || category.name,
        productCount: category.productCount || 0
      }));
      
      // Фильтруем только видимые категории
      const visibleCategories = allCategories.filter(category => 
        this.isCategoryVisible(category.id)
      );
      
      console.log(`Загружено ${visibleCategories.length} из ${allCategories.length} категорий (видимые):`, 
        visibleCategories.map(c => `${c.name} (${c.productCount} товаров)`));
      
      return visibleCategories;
    } catch (error) {
      console.error('Error getting categories:', error.message);
      throw error;
    }
  }

  // Получение всех категорий товаров (включая скрытые - для админки)
  async getAllCategories() {
    try {
      const client = this.createAuthenticatedClient();
      const response = await client.get('/entity/productfolder');
      
      // Обрабатываем категории для более удобного использования
      const categories = response.data.rows.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        pathName: category.pathName || category.name,
        productCount: category.productCount || 0
      }));
      
      console.log(`Загружено ${categories.length} категорий (все):`, categories.map(c => `${c.name} (${c.productCount} товаров)`));
      
      return categories;
    } catch (error) {
      console.error('Error getting all categories:', error.message);
      throw error;
    }
  }

  // Получение конкретного товара по ID
  async getProductById(id) {
    try {
      const client = this.createAuthenticatedClient();
      const response = await client.get(`/entity/product/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting product by ID:', error.message);
      throw error;
    }
  }

  // Получение списка изображений товара
  async getProductImages(productId) {
    try {
      const client = this.createAuthenticatedClient();
      const response = await client.get(`/entity/product/${productId}/images`);
      console.log(`Изображения для товара ${productId}:`, JSON.stringify(response.data, null, 2));
      
      // MoySklad может возвращать изображения в разных форматах
      // Проверяем различные возможные структуры
      let images = [];
      
      if (response.data.rows) {
        images = response.data.rows;
      } else if (Array.isArray(response.data)) {
        images = response.data;
      } else if (response.data.meta) {
        // Возможно, это одно изображение
        images = [response.data];
      }
      
      console.log(`Обработанные изображения для товара ${productId}:`, JSON.stringify(images, null, 2));
      return images;
    } catch (error) {
      console.error('Ошибка при получении изображений товара:', error.message);
      return [];
    }
  }

  // Получение бинарных данных изображения товара с кэшированием
  async getProductImage(productId, imageId) {
    const cacheKey = `${productId}_${imageId}`;
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey);
    }
    try {
      // Получаем список изображений
      const images = await this.getProductImages(productId);
      const image = images.find(img =>
        img.id === imageId ||
        (img.meta?.href && img.meta.href.split('/').pop() === imageId)
      );
      if (!image || !image.meta?.downloadHref) {
        return null;
      }
      // Качаем картинку по downloadHref
      const client = this.createAuthenticatedClient();
      const response = await client.get(image.meta.downloadHref, {
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/jpeg,image/png,image/*,*/*'
        }
      });
      const buffer = Buffer.from(response.data);
      imageCache.set(cacheKey, buffer);
      return buffer;
    } catch (error) {
      if (error.response && (error.response.status === 404 || error.response.status === 429)) {
        return null;
      }
      console.error(`Ошибка при получении изображения товара ${productId}:`, error.message);
      return null;
    }
  }

  // Получение товаров с изображениями
  async getProductsWithImages(page = 1, limit = 20, categoryId = null, search = null) {
    try {
      // Получаем список видимых категорий
      const visibleCategoryIds = this.getVisibleCategoryIds();
      
      // Если указана конкретная категория, проверяем её видимость
      if (categoryId && !this.isCategoryVisible(categoryId)) {
        console.log(`Category ${categoryId} is hidden, returning empty result`);
        return {
          products: [],
          total: 0,
          page,
          limit,
          hasMore: false
        };
      }
      
      // Получаем данные из МойСклад
      const productsData = await this.getProducts(page, limit, categoryId, search);
      
      // Если данных нет, возвращаем пустой результат
      if (!productsData.products || productsData.products.length === 0) {
        console.log('No products from MoySklad');
        return {
          products: [],
          total: 0,
          page,
          limit,
          hasMore: false
        };
      }
      
      // Фильтруем товары по видимым категориям (если не указана конкретная категория)
      let filteredProducts = productsData.products;
      if (!categoryId && visibleCategoryIds.length > 0) {
        filteredProducts = productsData.products.filter(product => {
          const productCategoryId = product.productFolder?.id;
          return !productCategoryId || this.isCategoryVisible(productCategoryId);
        });
        console.log(`Filtered products: ${filteredProducts.length} of ${productsData.products.length} (visible categories: ${visibleCategoryIds.length})`);
      }
      
      // Обрабатываем каждый товар
      const productsWithImages = await Promise.all(filteredProducts.map(async (product, index) => {
        // Отладочная информация для первого товара
        if (index === 0) {
          console.log('=== ОТЛАДКА ПЕРВОГО ТОВАРА ===');
          console.log('Полная структура товара:', JSON.stringify(product, null, 2));
          console.log('salePrices:', product.salePrices);
          console.log('buyPrice:', product.buyPrice);
          console.log('=== КОНЕЦ ОТЛАДКИ ===');
        }
        
        // Проверяем наличие изображений у товара
        let imageUrl = `/api/images/placeholder/${product.id}`;
        let hasImages = false;
        
        try {
          const images = await this.getProductImages(product.id);
          if (images && images.length > 0) {
            // MoySklad может использовать разные поля для ID изображения
            const firstImage = images[0];
            const imageId = firstImage.id || 
                           firstImage.meta?.href?.split('/').pop() || 
                           firstImage.filename || 
                           firstImage.name ||
                           'unknown';
            
            imageUrl = `/api/images/${product.id}/${imageId}`;
            hasImages = true;
            console.log(`Товар ${product.name} имеет ${images.length} изображений, ID первого: ${imageId}`);
          } else {
            console.log(`Товар ${product.name} не имеет изображений`);
          }
        } catch (error) {
          console.log(`Ошибка при получении изображений для товара ${product.name}:`, error.message);
        }
        
        // Извлекаем цену из salePrices
        let price = 0;
        if (product.salePrices && product.salePrices.length > 0) {
          console.log(`Товар ${product.name}: salePrices:`, JSON.stringify(product.salePrices));
          
          // Ищем первую цену с ненулевым значением
          const firstValidPrice = product.salePrices.find(p => p.value > 0);
          
          if (firstValidPrice) {
            price = firstValidPrice.value / 100;
            console.log(`Используем цену ${firstValidPrice.priceType?.name || 'неизвестная'} для ${product.name}: ${price}`);
          } else {
            console.log(`Нет валидных цен для товара ${product.name}`);
          }
        } else {
          console.log(`Нет цен для товара ${product.name}`);
        }
        
        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          code: product.code || '',
          price: price,
          currency: 'RUB',
          imageUrl: imageUrl,
          hasImages: hasImages,
          categoryId: product.productFolder?.id || null,
          categoryName: product.productFolder?.name || null
        };
      }));

      return {
        products: productsWithImages,
        total: filteredProducts.length,
        page,
        limit,
        hasMore: filteredProducts.length === limit
      };
    } catch (error) {
      console.error('Ошибка при получении товаров с изображениями:', error.message);
      // В случае ошибки возвращаем пустой результат
      return {
        products: [],
        total: 0,
        page,
        limit,
        hasMore: false
      };
    }
  }

  // Создание тестовых данных для демонстрации
  getTestProducts(page = 1, limit = 20) {
    const testProducts = [
      {
        id: 'test-1',
        name: 'Тестовый товар 1',
        description: 'Описание тестового товара 1',
        price: 1000,
        imageUrl: '/api/images/placeholder/test-1'
      },
      {
        id: 'test-2', 
        name: 'Тестовый товар 2',
        description: 'Описание тестового товара 2',
        price: 2000,
        imageUrl: '/api/images/placeholder/test-2'
      },
      {
        id: 'test-3',
        name: 'Тестовый товар 3', 
        description: 'Описание тестового товара 3',
        price: 1500,
        imageUrl: '/api/images/placeholder/test-3'
      }
    ];

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = testProducts.slice(startIndex, endIndex);

    return {
      products: paginatedProducts,
      total: testProducts.length,
      page,
      limit
    };
  }

  // Получение заглушки изображения
  async getPlaceholderImage(productId) {
    try {
      console.log('Creating placeholder for productId:', productId);
      
      // Создаём простую SVG заглушку
      const svgPlaceholder = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="300" fill="#4A90E2"/>
        <text x="150" y="150" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dy=".3em">Товар</text>
        <text x="150" y="180" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">ID: ${productId.substring(0, 8)}</text>
      </svg>`;
      
      const buffer = Buffer.from(svgPlaceholder, 'utf-8');
      console.log('Created placeholder buffer, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error(`Ошибка при создании заглушки для товара ${productId}:`, error.message);
      // Возвращаем простую заглушку в случае ошибки
      const fallbackSvg = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="300" fill="#cccccc"/>
        <text x="150" y="150" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dy=".3em">Нет фото</text>
      </svg>`;
      return Buffer.from(fallbackSvg, 'utf-8');
    }
  }

  // Получение настроек категорий (какие показывать/скрывать)
  async getCategorySettings() {
    try {
      const categories = await this.getAllCategories(); // Используем все категории для админки
      const settings = this.loadCategorySettings();
      
      return categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        pathName: category.pathName || category.name,
        productCount: category.productCount || 0,
        visible: settings[category.id] !== undefined ? settings[category.id] : true // По умолчанию все категории видимые
      }));
    } catch (error) {
      console.error('Error getting category settings:', error.message);
      throw error;
    }
  }

  // Обновление настроек категорий
  async updateCategorySettings(categorySettings) {
    try {
      const settings = {};
      
      categorySettings.forEach(category => {
        settings[category.id] = category.visible;
      });
      
      const success = this.saveCategorySettings(settings);
      
      if (success) {
        console.log('Category settings updated successfully');
        return { success: true, message: 'Настройки успешно сохранены' };
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error updating category settings:', error.message);
      throw error;
    }
  }

  // Проверка подключения к API
  async testConnection() {
    try {
      const client = this.createAuthenticatedClient();
      const response = await client.get('/entity/product?limit=1');
      return {
        success: true,
        accountId: this.accountId,
        productsCount: response.data.meta.size
      };
    } catch (error) {
      console.error('Error testing connection:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение списка видимых категорий
  getVisibleCategoryIds() {
    const settings = this.loadCategorySettings();
    const visibleIds = [];
    
    Object.keys(settings).forEach(categoryId => {
      if (settings[categoryId]) {
        visibleIds.push(categoryId);
      }
    });
    
    return visibleIds;
  }

  // Проверка видимости категории
  isCategoryVisible(categoryId) {
    const settings = this.loadCategorySettings();
    return settings[categoryId] !== undefined ? settings[categoryId] : true;
  }

  // Сброс всех настроек категорий (все категории видимые)
  resetCategorySettings() {
    try {
      const settingsFile = path.join(__dirname, '../data/category-settings.json');
      if (fs.existsSync(settingsFile)) {
        fs.unlinkSync(settingsFile);
      }
      console.log('Category settings reset successfully');
      return { success: true, message: 'Настройки категорий сброшены' };
    } catch (error) {
      console.error('Error resetting category settings:', error.message);
      throw error;
    }
  }
}

module.exports = new MoyskladService(); 