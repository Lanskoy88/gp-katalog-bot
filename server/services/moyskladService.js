const axios = require('axios');

// In-memory кэш изображений (на уровне модуля)
const imageCache = new Map();

class MoyskladService {
  constructor() {
    this.baseURL = 'https://api.moysklad.ru/api/remap/1.2';
    this.apiToken = process.env.MOYSKLAD_API_TOKEN;
    this.accountId = process.env.MOYSKLAD_ACCOUNT_ID;
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

  // Получение всех категорий товаров
  async getCategories() {
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
      
      console.log(`Загружено ${categories.length} категорий:`, categories.map(c => `${c.name} (${c.productCount} товаров)`));
      
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error.message);
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
      
      // Обрабатываем каждый товар
      const productsWithImages = await Promise.all(productsData.products.map(async (product, index) => {
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
          hasImages: hasImages
        };
      }));

      return {
        products: productsWithImages,
        total: productsData.total,
        page,
        limit,
        hasMore: productsData.hasMore
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
    // В реальном приложении это должно храниться в базе данных
    // Пока возвращаем все категории как видимые
    try {
      const categories = await this.getCategories();
      return categories.map(category => ({
        id: category.id,
        name: category.name,
        visible: true // По умолчанию все категории видимые
      }));
    } catch (error) {
      console.error('Error getting category settings:', error.message);
      throw error;
    }
  }

  // Обновление настроек категорий
  async updateCategorySettings(settings) {
    // В реальном приложении это должно сохраняться в базе данных
    console.log('Category settings updated:', settings);
    return { success: true };
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
}

module.exports = new MoyskladService(); 