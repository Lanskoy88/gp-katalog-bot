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
    
    // Отладочная информация
    console.log('MoyskladService constructor:');
    console.log('- MOYSKLAD_API_TOKEN exists:', !!process.env.MOYSKLAD_API_TOKEN);
    console.log('- MOYSKLAD_API_TOKEN length:', process.env.MOYSKLAD_API_TOKEN ? process.env.MOYSKLAD_API_TOKEN.length : 'NOT SET');
    console.log('- this.apiToken exists:', !!this.apiToken);
    console.log('- this.apiToken length:', this.apiToken ? this.apiToken.length : 'NOT SET');
    
    // Создаем директорию для данных если её нет
    this.ensureDataDirectory();

    // Rate limiting settings
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 500; // 500ms между запросами (2 запроса/сек)
    
    // Retry settings
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    
    // Cache settings
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    console.log('MoyskladService initialized with rate limiting and retry logic');
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
    console.log('createAuthenticatedClient:');
    console.log('- this.apiToken exists:', !!this.apiToken);
    console.log('- this.apiToken length:', this.apiToken ? this.apiToken.length : 'NOT SET');
    console.log('- Authorization header:', `Bearer ${this.apiToken}`);
    
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

  // Получение товаров с фильтрацией по видимым категориям
  async getProducts(page = 1, limit = 100, categoryId = null, search = null) {
    try {
      const client = this.createAuthenticatedClient();
      
      // Фильтрация по категории (если указана)
      if (categoryId && categoryId !== 'all') {
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
        
        let url = `/entity/product?limit=${limit}&offset=${(page - 1) * limit}&filter=productFolder.id=${categoryId}`;
        
        // Поиск по названию (если есть)
        if (search) {
          url += `&search=${encodeURIComponent(search)}`;
        }

        console.log('Requesting URL:', url);
        const response = await client.get(url, {
          headers: {
            'Accept': 'application/json;charset=utf-8'
          }
        });
        
        return await this.processProductsResponse(response, page, limit, categoryId);
        
      } else {
        // Если категория не указана, фильтруем по видимым категориям
        const visibleCategoryIds = this.getVisibleCategoryIds();
        if (visibleCategoryIds === null) {
          // Все категории видимые, загружаем все товары с увеличенным лимитом
          console.log('Все категории видимые, загружаем все товары');
          
          // Увеличиваем лимит для получения большего количества товаров
          const increasedLimit = Math.max(limit, 200);
          let url = `/entity/product?limit=${increasedLimit}&offset=${(page - 1) * increasedLimit}`;
          
          // Поиск по названию (если есть)
          if (search) {
            url += `&search=${encodeURIComponent(search)}`;
          }

          console.log('Requesting URL:', url);
          const response = await client.get(url, {
            headers: {
              'Accept': 'application/json;charset=utf-8'
            }
          });
          
          return await this.processProductsResponse(response, page, limit, null);
          
        } else if (visibleCategoryIds.length > 0) {
          // Разбиваем длинные фильтры на несколько запросов
          const maxCategoriesPerRequest = 10; // MoySklad ограничивает длину URL
          let allProducts = [];
          let totalCount = 0;
          
          for (let i = 0; i < visibleCategoryIds.length; i += maxCategoriesPerRequest) {
            const categoryBatch = visibleCategoryIds.slice(i, i + maxCategoriesPerRequest);
            const categoryFilter = categoryBatch.map(id => `productFolder.id=${id}`).join(';');
            
            let url = `/entity/product?limit=${limit * 2}&offset=0&filter=${categoryFilter}`;
            
            // Поиск по названию (если есть)
            if (search) {
              url += `&search=${encodeURIComponent(search)}`;
            }

            console.log(`Requesting products batch ${Math.floor(i / maxCategoriesPerRequest) + 1}/${Math.ceil(visibleCategoryIds.length / maxCategoriesPerRequest)}`);
            const response = await client.get(url, {
              headers: {
                'Accept': 'application/json;charset=utf-8'
              }
            });
            
            allProducts = allProducts.concat(response.data.rows);
            totalCount += response.data.meta.size;
          }
          
          // Применяем пагинацию к объединенным результатам
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedProducts = allProducts.slice(startIndex, endIndex);
          
          console.log(`Получено ${allProducts.length} товаров из ${totalCount} всего, показано ${paginatedProducts.length}`);
          
          return await this.processProductsResponse({ data: { rows: paginatedProducts, meta: { size: totalCount } } }, page, limit, null);
          
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
    } catch (error) {
      console.error('Ошибка при получении товаров:', error.message);
      
      // Если это ошибка 403 (нет прав), возвращаем тестовые данные
      if (error.response && error.response.status === 403) {
        console.log('Нет прав доступа к товарам (403), возвращаем тестовые данные');
        return this.getTestProducts(page, limit);
      }
      
      // В случае других ошибок возвращаем пустой результат
      return {
        products: [],
        total: 0,
        page,
        limit,
        hasMore: false
      };
    }
  }

  // Вспомогательный метод для получения категорий с подсчётом товаров
  async fetchCategoriesWithProductCounts(categories) {
    const client = this.createAuthenticatedClient();
    
    // Ограничение параллелизма и увеличенные задержки для избежания ошибок 412
    const maxParallel = 2;
    const delayMs = 500;
    let index = 0;
    async function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

    async function fetchProductCount(category) {
      try {
        const url = `/entity/product?filter=productFolder.id=${category.id}&limit=1`;
        const resp = await client.get(url, {
          headers: { 'Accept': 'application/json;charset=utf-8' }
        });
        const count = resp.data.meta && resp.data.meta.size ? resp.data.meta.size : 0;
        return count;
      } catch (e) {
        // Обработка ошибки 412 (Precondition Failed) - слишком частые запросы
        if (e.response && e.response.status === 412) {
          console.log(`Ошибка 412 для категории ${category.name}, возвращаем 0 и продолжаем`);
          return 0;
        }
        console.error(`Ошибка при получении количества товаров для категории ${category.name}:`, e.message);
        return 0;
      }
    }

    async function processQueue() {
      while (index < categories.length) {
        const batch = [];
        for (let i = 0; i < maxParallel && index < categories.length; i++, index++) {
          batch.push(fetchProductCount(categories[index]));
        }
        const counts = await Promise.all(batch);
        for (let j = 0; j < counts.length; j++) {
          categories[index - counts.length + j].productCount = counts[j];
        }
        if (index < categories.length) await delay(delayMs);
      }
      return categories;
    }

    await processQueue();
    return categories;
  }

  // Получение видимых категорий (для каталога)
  async getCategories() {
    try {
      const client = this.createAuthenticatedClient();
      const response = await client.get('/entity/productfolder', {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      });
      
      // Обрабатываем категории для более удобного использования
      const allCategories = response.data.rows.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        pathName: category.pathName || category.name,
        productCount: 0 // Заполним позже
      }));
      
      console.log(`Загружено ${allCategories.length} категорий (все)`);

      // Получаем количество товаров для всех категорий
      await this.fetchCategoriesWithProductCounts(allCategories);
      
      // Фильтруем по видимым категориям
      const visibleCategoryIds = this.getVisibleCategoryIds();
      let categories;
      
      if (visibleCategoryIds === null) {
        // Все категории видимые
        categories = allCategories;
        console.log(`Загружено ${categories.length} категорий (видимые):`, categories.map(c => `${c.name} (${c.productCount} товаров)`));
      } else if (visibleCategoryIds.length > 0) {
        // Только видимые категории
        categories = allCategories.filter(category => visibleCategoryIds.includes(category.id));
        console.log(`Загружено ${categories.length} из ${allCategories.length} категорий (видимые):`, categories.map(c => `${c.name} (${c.productCount} товаров)`));
      } else {
        // Нет видимых категорий
        categories = [];
        console.log('Нет видимых категорий, возвращаем пустой результат');
      }
      
      return categories;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('Нет доступа к категориям товаров (403), создаем виртуальную категорию "Все товары"');
        // Создаем виртуальную категорию "Все товары"
        return [{
          id: 'all',
          name: 'Все товары',
          description: 'Все доступные товары',
          pathName: 'Все товары',
          productCount: 0
        }];
      }
      console.error('Error getting categories:', error.message);
      throw error;
    }
  }

  // Получение всех категорий (для админки)
  async getAllCategories() {
    try {
      const client = this.createAuthenticatedClient();
      const response = await client.get('/entity/productfolder', {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      });
      
      // Обрабатываем категории для более удобного использования
      const categories = response.data.rows.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        pathName: category.pathName || category.name,
        productCount: 0 // Заполним позже
      }));
      
      console.log(`Загружено ${categories.length} категорий (все)`);

      // Получаем количество товаров для всех категорий
      await this.fetchCategoriesWithProductCounts(categories);
      
      console.log(`Категории с количеством товаров:`, categories.map(c => `${c.name} (${c.productCount})`).join(', '));
      return categories;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('Нет доступа к категориям товаров (403), создаем виртуальную категорию "Все товары"');
        // Создаем виртуальную категорию "Все товары"
        return [{
          id: 'all',
          name: 'Все товары',
          description: 'Все доступные товары',
          pathName: 'Все товары',
          productCount: 0
        }];
      }
      console.error('Error getting all categories:', error.message);
      throw error;
    }
  }

  // Получение конкретного товара по ID
  async getProductById(id) {
    try {
      const client = this.createAuthenticatedClient();
      const response = await client.get(`/entity/product/${id}`, {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      });
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
      const response = await client.get(`/entity/product/${productId}/images`, {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      });
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
      const image = images.find(img => {
        // Проверяем различные способы идентификации изображения
        if (img.id === imageId) return true;
        if (img.meta && img.meta.href && img.meta.href.split('/').pop() === imageId) return true;
        // Проверяем по имени файла
        if (img.filename && img.filename.replace(/\.[^/.]+$/, "") === imageId) return true;
        return false;
      });
      
      if (!image || !image.meta || !image.meta.downloadHref) {
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
  async getProductsWithImages(page = 1, limit = 100, categoryId = null, search = null) {
    // Если это первая страница и не указана категория, попробуем загрузить больше товаров
    if (page === 1 && !categoryId && !search) {
      return await this.getAllProductsWithImages(limit);
    }
    
    return await this.getProductsWithImagesPaginated(page, limit, categoryId, search);
  }

  // Получение всех товаров (для первой страницы)
  async getAllProductsWithImages(limit = 100) {
    try {
      const client = this.createAuthenticatedClient();
      
      // Сначала получаем общее количество товаров
      const countResponse = await client.get('/entity/product?limit=1', {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      });
      
      const totalProducts = countResponse.data.meta.size;
      console.log(`Всего товаров в системе: ${totalProducts}`);
      
      // Если товаров меньше 1000, загружаем все сразу
      if (totalProducts <= 1000) {
        const increasedLimit = Math.max(limit, 1000);
        let url = `/entity/product?limit=${increasedLimit}&offset=0`;
        
        console.log('Requesting all products URL:', url);
        const response = await client.get(url, {
          headers: {
            'Accept': 'application/json;charset=utf-8'
          }
        });
        
        console.log(`Загружено ${response.data.rows.length} товаров из ${response.data.meta.size} всего`);
        
        return await this.processProductsResponse(response, 1, limit, null);
      } else {
        // Если товаров много, загружаем по частям
        console.log(`Товаров много (${totalProducts}), загружаем по частям`);
        return await this.loadProductsInBatches(limit, totalProducts);
      }
    } catch (error) {
      console.error('Ошибка при получении всех товаров:', error.message);
      
      // Если это ошибка 403 (нет прав), возвращаем тестовые данные
      if (error.response && error.response.status === 403) {
        console.log('Нет прав доступа к товарам (403), возвращаем тестовые данные');
        return this.getTestProducts(1, limit);
      }
      
      // В случае других ошибок возвращаем к обычной пагинации
      return await this.getProductsWithImagesPaginated(1, limit, null, null);
    }
  }

  // Загрузка товаров по частям
  async loadProductsInBatches(limit, totalProducts) {
    try {
      const client = this.createAuthenticatedClient();
      const batchSize = 500;
      let allProducts = [];
      
      // Загружаем первые несколько партий для первой страницы
      const batchesToLoad = Math.ceil(limit / batchSize) + 1;
      
      for (let i = 0; i < batchesToLoad; i++) {
        const offset = i * batchSize;
        const url = `/entity/product?limit=${batchSize}&offset=${offset}`;
        
        console.log(`Загружаем партию ${i + 1}/${batchesToLoad}, offset: ${offset}`);
        const response = await client.get(url, {
          headers: {
            'Accept': 'application/json;charset=utf-8'
          }
        });
        
        allProducts = allProducts.concat(response.data.rows);
        
        // Если получили меньше товаров, чем ожидали, значит это последняя партия
        if (response.data.rows.length < batchSize) {
          break;
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Загружено ${allProducts.length} товаров из ${totalProducts} всего`);
      
      return await this.processProductsResponse({ 
        data: { 
          rows: allProducts, 
          meta: { size: totalProducts } 
        } 
      }, 1, limit, null);
    } catch (error) {
      console.error('Ошибка при загрузке товаров по частям:', error.message);
      throw error;
    }
  }

  // Получение товаров с изображениями и фильтрацией по видимым категориям (с пагинацией)
  async getProductsWithImagesPaginated(page = 1, limit = 100, categoryId = null, search = null) {
    try {
      const client = this.createAuthenticatedClient();
      
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
        
        let url = `/entity/product?limit=${limit}&offset=${(page - 1) * limit}&filter=productFolder.id=${categoryId}`;
        
        // Поиск по названию (если есть)
        if (search) {
          url += `&search=${encodeURIComponent(search)}`;
        }

        console.log('Requesting products URL:', url);
        const response = await client.get(url, {
          headers: {
            'Accept': 'application/json;charset=utf-8'
          }
        });
        
        return await this.processProductsResponse(response, page, limit, categoryId);
        
      } else {
        // Если категория не указана, фильтруем по видимым категориям
        const visibleCategoryIds = this.getVisibleCategoryIds();
        if (visibleCategoryIds === null) {
          // Все категории видимые, загружаем все товары с увеличенным лимитом
          console.log('Все категории видимые, загружаем все товары');
          
          // Увеличиваем лимит для получения большего количества товаров
          const increasedLimit = Math.max(limit, 200);
          let url = `/entity/product?limit=${increasedLimit}&offset=${(page - 1) * increasedLimit}`;
          
          // Поиск по названию (если есть)
          if (search) {
            url += `&search=${encodeURIComponent(search)}`;
          }

          console.log('Requesting products URL:', url);
          const response = await client.get(url, {
            headers: {
              'Accept': 'application/json;charset=utf-8'
            }
          });
          
          return await this.processProductsResponse(response, page, limit, null);
          
        } else if (visibleCategoryIds.length > 0) {
          // Разбиваем длинные фильтры на несколько запросов
          const maxCategoriesPerRequest = 10; // MoySklad ограничивает длину URL
          let allProducts = [];
          let totalCount = 0;
          
          for (let i = 0; i < visibleCategoryIds.length; i += maxCategoriesPerRequest) {
            const categoryBatch = visibleCategoryIds.slice(i, i + maxCategoriesPerRequest);
            const categoryFilter = categoryBatch.map(id => `productFolder.id=${id}`).join(';');
            
            let url = `/entity/product?limit=${limit * 2}&offset=0&filter=${categoryFilter}`;
            
            // Поиск по названию (если есть)
            if (search) {
              url += `&search=${encodeURIComponent(search)}`;
            }

            console.log(`Requesting products batch ${Math.floor(i / maxCategoriesPerRequest) + 1}/${Math.ceil(visibleCategoryIds.length / maxCategoriesPerRequest)}`);
            const response = await client.get(url, {
              headers: {
                'Accept': 'application/json;charset=utf-8'
              }
            });
            
            allProducts = allProducts.concat(response.data.rows);
            totalCount += response.data.meta.size;
          }
          
          // Применяем пагинацию к объединенным результатам
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedProducts = allProducts.slice(startIndex, endIndex);
          
          console.log(`Получено ${allProducts.length} товаров из ${totalCount} всего, показано ${paginatedProducts.length}`);
          
          return await this.processProductsResponse({ data: { rows: paginatedProducts, meta: { size: totalCount } } }, page, limit, null);
          
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
    } catch (error) {
      console.error('Ошибка при получении товаров с изображениями:', error.message);
      
      // Если это ошибка 403 (нет прав), возвращаем тестовые данные
      if (error.response && error.response.status === 403) {
        console.log('Нет прав доступа к товарам (403), возвращаем тестовые данные');
        return this.getTestProducts(page, limit);
      }
      
      // В случае других ошибок возвращаем пустой результат
      return {
        products: [],
        total: 0,
        page,
        limit,
        hasMore: false
      };
    }
  }

  // Вспомогательный метод для обработки ответа с товарами
  async processProductsResponse(response, page, limit, categoryId = null) {
    const products = response.data.rows;
    
    console.log(`Обрабатываем ${products.length} товаров`);

    // Дополнительная фильтрация по видимым категориям (только если не запрашивается конкретная категория)
    const visibleCategoryIds = this.getVisibleCategoryIds();
    let filteredProducts = products;
    
    if (categoryId) {
      // Если запрашивается конкретная категория, не применяем дополнительную фильтрацию
      // так как категория уже проверена на видимость в getProductsWithImages
      console.log(`Запрошена конкретная категория ${categoryId}, дополнительная фильтрация не применяется`);
    } else if (visibleCategoryIds !== null) {
      // Если есть настройки видимости, фильтруем товары
      console.log(`Применяем фильтрацию по ${visibleCategoryIds.length} видимым категориям:`, visibleCategoryIds);
      
      filteredProducts = products.filter(product => {
        const productCategoryId = product.productFolder && product.productFolder.id;
        if (!productCategoryId) {
          // Товары без категории показываем только если есть видимые категории
          const shouldShow = visibleCategoryIds.length > 0;
          if (!shouldShow) {
            console.log(`Скрываем товар без категории: ${product.name}`);
          }
          return shouldShow;
        }
        const isVisible = visibleCategoryIds.includes(productCategoryId);
        if (!isVisible) {
          console.log(`Скрываем товар из скрытой категории: ${product.name} (категория: ${product.productFolder && product.productFolder.name})`);
        }
        return isVisible;
      });
      
      console.log(`Отфильтровано ${filteredProducts.length} товаров из ${products.length} по видимым категориям`);
    } else {
      console.log('Все категории видимые, фильтрация не применяется');
    }

    // Обрабатываем товары с изображениями
    const productsWithImages = await Promise.all(filteredProducts.map(async (product) => {
      let imageUrl = null;
      let hasImages = false;

      try {
        const images = await this.getProductImages(product.id);
        if (images && images.length > 0) {
          const firstImage = images[0];
          // Используем правильный идентификатор изображения
          let imageId = firstImage.id;
          if (!imageId && firstImage.meta && firstImage.meta.href) {
            // Извлекаем ID из href
            imageId = firstImage.meta.href.split('/').pop();
          }
          if (!imageId && firstImage.filename) {
            // Используем имя файла без расширения
            imageId = firstImage.filename.replace(/\.[^/.]+$/, "");
          }
          
          if (imageId) {
            imageUrl = `/api/images/${product.id}/${imageId}`;
            hasImages = true;
            console.log(`Найдено изображение для товара ${product.name}: ${imageUrl}`);
          } else {
            imageUrl = `/api/images/placeholder/${product.id}`;
            console.log(`Не удалось определить ID изображения для товара ${product.name}, используем заглушку`);
          }
        } else {
          imageUrl = `/api/images/placeholder/${product.id}`;
          console.log(`Нет изображений для товара ${product.name}, используем заглушку`);
        }
      } catch (imageError) {
        console.error(`Ошибка при получении изображений для товара ${product.name}:`, imageError.message);
        imageUrl = `/api/images/placeholder/${product.id}`;
      }

      // Получаем цену товара - исправленная логика
      let price = 0;
      try {
        // Сначала пробуем получить цену через специальный endpoint
        const client = this.createAuthenticatedClient();
        const priceResponse = await client.get(`/entity/product/${product.id}/price`);
        if (priceResponse.data && priceResponse.data.value) {
          price = priceResponse.data.value / 100; // MoySklad хранит цены в копейках
        } else {
          // Если нет цены через endpoint, пробуем получить из самого товара
          if (product.salePrices && product.salePrices.length > 0) {
            price = product.salePrices[0].value / 100;
          }
        }
      } catch (priceError) {
        console.log(`Нет цен для товара ${product.name}, пробуем из самого товара`);
        // Пробуем получить цену из самого товара
        if (product.salePrices && product.salePrices.length > 0) {
          price = product.salePrices[0].value / 100;
        }
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
        categoryId: product.productFolder && product.productFolder.id || null,
        categoryName: product.productFolder && product.productFolder.name || null
      };
    }));

    console.log(`Возвращаем ${productsWithImages.length} товаров с изображениями и ценами`);

    return {
      products: productsWithImages,
      total: response.data.meta.size, // Используем общее количество товаров из API
      page,
      limit,
      hasMore: productsWithImages.length === limit && (page * limit) < response.data.meta.size
    };
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
      
      // Используем productCount из самих категорий для ускорения
      const categoriesWithSettings = categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        pathName: category.pathName || category.name,
        productCount: category.productCount || 0,
        visible: settings[category.id] !== undefined ? settings[category.id] : true // По умолчанию все категории видимые
      }));
      
      console.log(`Загружено ${categoriesWithSettings.length} категорий с количеством товаров из MoySklad`);
      
      return categoriesWithSettings;
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

  // Тестирование подключения к MoySklad
  async testConnection() {
    try {
      const client = this.createAuthenticatedClient();
      
      // Проверяем токен
      console.log('Проверяем токен MoySklad...');
      console.log('Токен:', this.apiToken ? `${this.apiToken.substring(0, 10)}...` : 'НЕ УСТАНОВЛЕН');
      
      // Пробуем разные эндпоинты для диагностики
      const endpoints = [
        { name: 'Товары (базовый)', url: '/entity/product?limit=1' },
        { name: 'Товары (без фильтров)', url: '/entity/product' },
        { name: 'Категории', url: '/entity/productfolder' },
        { name: 'Организация', url: '/entity/organization' },
        { name: 'Склад', url: '/entity/store' }
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Тестируем ${endpoint.name}...`);
          const response = await client.get(endpoint.url, {
            headers: {
              'Accept': 'application/json;charset=utf-8'
            },
            timeout: 10000
          });
          
          results.push({
            endpoint: endpoint.name,
            status: 'success',
            statusCode: response.status,
            data: response.data
          });
          
          console.log(`✅ ${endpoint.name}: ${response.status} - ${(response.data.meta && response.data.meta.size) || 'N/A'} записей`);
          
        } catch (error) {
          results.push({
            endpoint: endpoint.name,
            status: 'error',
            statusCode: (error.response && error.response.status) || 'unknown',
            error: error.message
          });
          
          console.log(`❌ ${endpoint.name}: ${(error.response && error.response.status) || 'unknown'} - ${error.message}`);
        }
      }
      
      // Анализируем результаты
      const successfulEndpoints = results.filter(r => r.status === 'success');
      const failedEndpoints = results.filter(r => r.status === 'error');
      
      if (successfulEndpoints.length > 0) {
        const productEndpoint = successfulEndpoints.find(r => r.endpoint.includes('Товары'));
        if (productEndpoint) {
          return {
            success: true,
            message: 'Подключение к MoySklad успешно',
                    productCount: (productEndpoint.data.meta && productEndpoint.data.meta.size) || 0,
        sampleProduct: (productEndpoint.data.rows && productEndpoint.data.rows[0] && productEndpoint.data.rows[0].name) || 'Нет товаров',
            diagnostics: results
          };
        }
      }
      
      return {
        success: false,
        message: 'Проблемы с подключением к MoySklad',
        diagnostics: results,
        recommendations: [
          'Проверьте правильность токена доступа',
          'Убедитесь, что токен имеет права на чтение товаров',
          'Проверьте, что токен не истек',
          'Убедитесь, что в MoySklad есть товары'
        ]
      };
      
    } catch (error) {
      console.error('Error testing MoySklad connection:', error.message);
      return {
        success: false,
        message: `Ошибка подключения к MoySklad: ${error.message}`,
        error: error.message,
        recommendations: [
          'Проверьте правильность токена доступа',
          'Убедитесь, что токен имеет права на чтение товаров'
        ]
      };
    }
  }

  // Получение списка видимых категорий
  getVisibleCategoryIds() {
    const settings = this.loadCategorySettings();
    
    // Если файл настроек не существует или пустой, все категории видимые
    if (!settings || Object.keys(settings).length === 0) {
      console.log('Файл настроек категорий не найден, все категории видимые');
      return null; // null означает "все категории видимые"
    }
    
    const visibleIds = [];
    Object.keys(settings).forEach(categoryId => {
      if (settings[categoryId]) {
        visibleIds.push(categoryId);
      }
    });
    
    console.log(`Найдено ${visibleIds.length} видимых категорий из ${Object.keys(settings).length} настроенных`);
    return visibleIds;
  }

  // Проверка видимости категории
  isCategoryVisible(categoryId) {
    // Виртуальная категория "all" всегда видима
    if (categoryId === 'all') {
      return true;
    }
    
    const settings = this.loadCategorySettings();
    
    // Если файл настроек не существует или пустой, все категории видимые
    if (!settings || Object.keys(settings).length === 0) {
      return true;
    }
    
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

  // Execute request with retry logic
  async executeRequest(request) {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await request();
        return response;
      } catch (error) {
        lastError = error;
        // Don't retry on 403 (forbidden) or 401 (unauthorized)
        if (error.response && (error.response.status === 403 || error.response.status === 401)) {
          throw error;
        }
        // Handle rate limiting (429)
        if (error.response && error.response.status === 429) {
          const retryAfter = error.response.headers && error.response.headers['retry-after'] ? parseInt(error.response.headers['retry-after'], 10) : 60;
          console.log(`Rate limited (429). Waiting ${retryAfter} seconds before retry...`);
          await this.delay(retryAfter * 1000);
          continue;
        }
        // Exponential backoff for other errors
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.log(`Request failed (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    throw lastError;
  }
}

module.exports = new MoyskladService(); 