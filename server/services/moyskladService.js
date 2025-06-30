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
      timeout: 30000,
      validateStatus: function (status) {
        return status >= 200 && status < 300; // default
      }
    });
  }

  // Получение товаров с пагинацией и фильтрацией по видимым категориям
  async getProducts(page = 1, limit = 20, categoryId = null, search = null) {
    try {
      const client = this.createAuthenticatedClient();
      
      let url = `/entity/product?limit=${limit * 2}&offset=${(page - 1) * limit}`; // Увеличиваем лимит для компенсации фильтрации
      
      // Фильтрация по категории (если указана)
      if (categoryId) {
        // Проверяем, что запрашиваемая категория видима
        if (!this.isCategoryVisible(categoryId)) {
          console.log(`Категория ${categoryId} скрыта, возвращаем пустой результат`);
          return {
            products: [],
            total: 0,
            hasMore: false
          };
        }
        url += `&filter=productFolder.id=${categoryId}`;
      } else {
        // Если категория не указана, фильтруем по видимым категориям
        const visibleCategoryIds = this.getVisibleCategoryIds();
        if (visibleCategoryIds.length > 0) {
          const categoryFilter = visibleCategoryIds.map(id => `productFolder.id=${id}`).join(';');
          url += `&filter=${categoryFilter}`;
          console.log(`Фильтруем товары по видимым категориям: ${visibleCategoryIds.length} категорий`);
        } else {
          console.log('Нет видимых категорий, возвращаем пустой результат');
          return {
            products: [],
            total: 0,
            hasMore: false
          };
        }
      }
      
      // Поиск по названию (если есть)
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      console.log('Requesting URL:', url);
      const response = await client.get(url);
      
      // Дополнительная фильтрация на стороне сервера
      let filteredProducts = response.data.rows;
      
      if (!categoryId) {
        // Если категория не указана, фильтруем товары по видимым категориям
        filteredProducts = filteredProducts.filter(product => {
          const productCategoryId = product.productFolder?.id;
          if (!productCategoryId) {
            // Товары без категории показываем только если есть видимые категории
            return this.getVisibleCategoryIds().length > 0;
          }
          return this.isCategoryVisible(productCategoryId);
        });
      }
      
      // Применяем пагинацию к отфильтрованным товарам
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
      
      console.log(`Получено ${response.data.rows.length} товаров, отфильтровано ${filteredProducts.length}, показано ${paginatedProducts.length}`);
      
      return {
        products: paginatedProducts,
        total: filteredProducts.length,
        hasMore: filteredProducts.length > endIndex
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

  // Получение товаров с изображениями и фильтрацией по видимым категориям
  async getProductsWithImages(page = 1, limit = 20, categoryId = null, search = null) {
    try {
      const client = this.createAuthenticatedClient();
      
      let url = `/entity/product?limit=${limit * 2}&offset=${(page - 1) * limit}`; // Увеличиваем лимит для компенсации фильтрации
      
      // Фильтрация по категории (если указана)
      if (categoryId) {
        // Проверяем, что запрашиваемая категория видима
        if (!this.isCategoryVisible(categoryId)) {
          console.log(`Категория ${categoryId} скрыта, возвращаем пустой результат`);
          return {
            products: [],
            total: 0,
            page,
            limit,
            hasMore: false
          };
        }
        url += `&filter=productFolder.id=${categoryId}`;
      } else {
        // Если категория не указана, фильтруем по видимым категориям
        const visibleCategoryIds = this.getVisibleCategoryIds();
        if (visibleCategoryIds.length > 0) {
          const categoryFilter = visibleCategoryIds.map(id => `productFolder.id=${id}`).join(';');
          url += `&filter=${categoryFilter}`;
          console.log(`Фильтруем товары по видимым категориям: ${visibleCategoryIds.length} категорий`);
        } else {
          console.log('Нет видимых категорий, возвращаем пустой результат');
          return {
            products: [],
            total: 0,
            page,
            limit,
            hasMore: false
          };
        }
      }
      
      // Поиск по названию (если есть)
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      console.log('Requesting products URL:', url);
      const response = await client.get(url);
      
      // Дополнительная фильтрация на стороне сервера для товаров без категории
      let filteredProducts = response.data.rows;
      
      if (!categoryId) {
        // Если категория не указана, фильтруем товары по видимым категориям
        filteredProducts = filteredProducts.filter(product => {
          const productCategoryId = product.productFolder?.id;
          if (!productCategoryId) {
            // Товары без категории показываем только если есть видимые категории
            return this.getVisibleCategoryIds().length > 0;
          }
          return this.isCategoryVisible(productCategoryId);
        });
      }
      
      // Применяем пагинацию к отфильтрованным товарам
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
      
      console.log(`Получено ${response.data.rows.length} товаров, отфильтровано ${filteredProducts.length}, показано ${paginatedProducts.length}`);

      // Обрабатываем товары с изображениями
      const productsWithImages = await Promise.all(paginatedProducts.map(async (product) => {
        let imageUrl = null;
        let hasImages = false;

        try {
          const images = await this.getProductImages(product.id);
          if (images && images.length > 0) {
            const firstImage = images[0];
            imageUrl = `/api/images/${product.id}/${firstImage.id}`;
            hasImages = true;
            console.log(`Найдено изображение для товара ${product.name}: ${imageUrl}`);
          } else {
            imageUrl = `/api/images/placeholder/${product.id}`;
            console.log(`Нет изображений для товара ${product.name}, используем заглушку`);
          }
        } catch (imageError) {
          console.error(`Ошибка при получении изображений для товара ${product.name}:`, imageError.message);
          imageUrl = `/api/images/placeholder/${product.id}`;
        }

        // Получаем цену товара
        let price = 0;
        try {
          const priceResponse = await client.get(`/entity/product/${product.id}/price`);
          if (priceResponse.data && priceResponse.data.value) {
            price = priceResponse.data.value / 100; // MoySklad хранит цены в копейках
          }
        } catch (priceError) {
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
        hasMore: filteredProducts.length > endIndex
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