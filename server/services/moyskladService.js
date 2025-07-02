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

    // Rate limiting settings для соблюдения лимитов МойСклад
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 500; // 500ms между запросами (2 запроса/сек)
    this.maxConcurrentRequests = 1; // Максимум 1 параллельный запрос
    this.activeRequests = 0;
    
    // Retry settings с экспоненциальной задержкой
    this.maxRetries = 5;
    this.baseDelay = 1000; // 1 second
    
    // Cache settings
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Счетчики для отслеживания лимитов
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.error429Count = 0;
    
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

  // Улучшенная функция выполнения запросов с соблюдением лимитов
  async executeRequest(request) {
    // Временно отключаем rate limiting для тестирования
    try {
      return await request();
    } catch (error) {
      throw error;
    }
    
    // Закомментированный код rate limiting
    /*
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
      this.processQueue();
    });
    */
  }

  // Обработка очереди запросов с соблюдением лимитов
  async processQueue() {
    if (this.isProcessing || this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const { request, resolve, reject } = this.requestQueue.shift();
      
      // Проверяем лимиты
      const now = Date.now();
      if (now - this.lastResetTime > 3000) { // Сброс счетчика каждые 3 секунды
        this.requestCount = 0;
        this.lastResetTime = now;
      }

      if (this.requestCount >= 20) { // Лимит: 20 запросов за 3 секунды
        console.log('⚠️ Достигнут лимит запросов, ждем...');
        await this.delay(3000 - (now - this.lastResetTime));
        this.requestCount = 0;
        this.lastResetTime = Date.now();
      }

      // Соблюдаем минимальный интервал между запросами
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await this.delay(this.minRequestInterval - timeSinceLastRequest);
      }

      this.activeRequests++;
      this.requestCount++;
      this.lastRequestTime = Date.now();

      // Выполняем запрос с retry логикой
      this.executeWithRetry(request, resolve, reject);
    }

    this.isProcessing = false;
  }

  // Выполнение запроса с retry логикой
  async executeWithRetry(request, resolve, reject) {
    let retries = 0;
    
    while (retries <= this.maxRetries) {
      try {
        const response = await request();
        this.activeRequests--;
        resolve(response);
        return;
      } catch (error) {
        this.activeRequests--;
        
        if (error.response && error.response.status === 429) {
          this.error429Count++;
          console.log(`⚠️ Ошибка 429 (Too Many Requests), попытка ${retries + 1}/${this.maxRetries + 1}`);
          
          if (this.error429Count > 200) {
            console.error('❌ Превышен лимит ошибок 429, приостанавливаем запросы на час');
            reject(new Error('API rate limit exceeded, too many 429 errors'));
            return;
          }
          
          // Экспоненциальная задержка для 429 ошибок
          const delay = Math.min(this.baseDelay * Math.pow(2, retries), 30000);
          console.log(`⏳ Ждем ${delay}ms перед повторной попыткой...`);
          await this.delay(delay);
          retries++;
          
        } else if (error.response && error.response.status === 412) {
          console.log(`⚠️ Ошибка 412 (Precondition Failed), попытка ${retries + 1}/${this.maxRetries + 1}`);
          
          // Для 412 ошибок используем меньшую задержку
          const delay = Math.min(1000 * Math.pow(2, retries), 10000);
          console.log(`⏳ Ждем ${delay}ms перед повторной попыткой...`);
          await this.delay(delay);
          retries++;
          
        } else {
          // Для других ошибок не повторяем
          reject(error);
          return;
        }
      }
    }
    
    reject(new Error(`Max retries (${this.maxRetries}) exceeded`));
  }

  // Вспомогательная функция задержки
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Получение товаров с фильтрацией по видимым категориям
  async getProducts(page = 1, limit = 100, categoryId = null, search = null) {
    try {
      console.log(`getProducts called with: page=${page}, limit=${limit}, categoryId=${categoryId}, search=${search}`);
      
      const client = this.createAuthenticatedClient();
      
      // Фильтрация по категории (если указана)
      if (categoryId && categoryId !== 'all') {
        console.log(`Filtering by specific category: ${categoryId}`);
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
        const response = await this.executeRequest(() => client.get(url, {
          headers: {
            'Accept': 'application/json;charset=utf-8'
          }
        }));
        
        return await this.processProductsResponse(response, page, limit, categoryId);
        
      } else {
        // Если категория не указана, фильтруем по видимым категориям
        const visibleCategoryIds = this.getVisibleCategoryIds();
        console.log(`Visible category IDs:`, visibleCategoryIds);
        
        if (visibleCategoryIds === null) {
          // Все категории видимые, загружаем все товары с увеличенным лимитом
          console.log('Все категории видимые, загружаем все товары');
          
          // Увеличиваем лимит для получения большего количества товаров
          const increasedLimit = Math.max(limit, 500);
          let url = `/entity/product?limit=${increasedLimit}&offset=${(page - 1) * increasedLimit}`;
          
          // Поиск по названию (если есть)
          if (search) {
            url += `&search=${encodeURIComponent(search)}`;
          }

          console.log('Requesting URL:', url);
          const response = await this.executeRequest(() => client.get(url, {
            headers: {
              'Accept': 'application/json;charset=utf-8'
            }
          }));
          
          console.log('Response received, processing...');
          return await this.processProductsResponse(response, page, limit, null);
          
        } else if (visibleCategoryIds.length > 0) {
          console.log(`Фильтруем по ${visibleCategoryIds.length} видимым категориям`);
          // Разбиваем длинные фильтры на несколько запросов
          const maxCategoriesPerRequest = 5; // Уменьшаем для соблюдения лимитов
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
            const response = await this.executeRequest(() => client.get(url, {
              headers: {
                'Accept': 'application/json;charset=utf-8'
              }
            }));
            
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
          // Нет видимых категорий
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
      console.error('Error in getProducts:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  // Получение количества товаров для категорий с соблюдением лимитов
  async fetchCategoriesWithProductCounts(categories) {
    const client = this.createAuthenticatedClient();
    
    // Уменьшаем нагрузку на API - делаем запросы последовательно с большими задержками
    const delayMs = 500; // Увеличиваем задержку до 500ms
    let processedCount = 0;

    for (const category of categories) {
      try {
        // Добавляем задержку перед каждым запросом
        if (processedCount > 0) {
          await this.delay(delayMs);
        }
        
        const url = `/entity/product?filter=productFolder.id=${category.id}&limit=1`;
        const resp = await this.executeRequest(() => client.get(url, {
          headers: { 'Accept': 'application/json;charset=utf-8' }
        }));
        const count = resp.data.meta && resp.data.meta.size ? resp.data.meta.size : 0;
        category.productCount = count;
        processedCount++;
        
        // Логируем прогресс каждые 10 категорий
        if (processedCount % 10 === 0) {
          console.log(`Обработано ${processedCount}/${categories.length} категорий`);
        }
        
      } catch (e) {
        // Обработка ошибок - возвращаем 0 и продолжаем
        if (e.response && (e.response.status === 412 || e.response.status === 429)) {
          console.log(`Ошибка ${e.response.status} для категории ${category.name}, возвращаем 0`);
          category.productCount = 0;
        } else {
          console.error(`Ошибка при получении количества товаров для категории ${category.name}:`, e.message);
          category.productCount = 0;
        }
        processedCount++;
        
        // При ошибках увеличиваем задержку
        await this.delay(delayMs * 2);
      }
    }
    
    console.log(`Завершена обработка ${processedCount} категорий`);
    return categories;
  }

  // Получение видимых категорий (для каталога)
  async getCategories() {
    try {
      const client = this.createAuthenticatedClient();
      const response = await this.executeRequest(() => client.get('/entity/productfolder', {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      }));
      
      // Обрабатываем категории для более удобного использования
      const allCategories = response.data.rows.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        pathName: category.pathName || category.name,
        productCount: 0 // Заполним позже
      }));
      
      console.log(`Загружено ${allCategories.length} категорий (все)`);

      // Получаем общее количество товаров
      let totalProducts = 0;
      try {
        const productsResponse = await this.executeRequest(() => client.get('/entity/product?limit=1'));
        totalProducts = productsResponse.data.meta && productsResponse.data.meta.size ? productsResponse.data.meta.size : 0;
        console.log(`Общее количество товаров в системе: ${totalProducts}`);
      } catch (error) {
        console.error('Ошибка при получении общего количества товаров:', error.message);
        totalProducts = 0;
      }

      // Получаем количество товаров для всех категорий (с ограничением)
      if (allCategories.length <= 20) {
        // Временно отключаем подсчёт для избежания ошибок 412
        console.log('Отключаем подсчёт товаров в категориях для избежания ошибок 412');
        allCategories.forEach(category => {
          category.productCount = '~'; // Показываем что товары есть, но количество неизвестно
        });
      } else {
        console.log(`Слишком много категорий (${allCategories.length}), отключаем подсчёт для избежания ошибок 412`);
        // Отключаем подсчёт для всех категорий
        allCategories.forEach(category => {
          category.productCount = '~'; // Показываем что товары есть, но количество неизвестно
        });
      }
      
      // Добавляем виртуальную категорию "Все товары" в начало списка
      const allProductsCategory = {
        id: 'all',
        name: 'Все товары',
        description: 'Все доступные товары',
        pathName: 'Все товары',
        productCount: totalProducts
      };
      
      // Фильтруем по видимым категориям
      const visibleCategoryIds = this.getVisibleCategoryIds();
      let categories;
      
      if (visibleCategoryIds === null) {
        // Все категории видимые
        categories = [allProductsCategory, ...allCategories];
        console.log(`Загружено ${categories.length} категорий (видимые):`, categories.map(c => `${c.name} (${c.productCount} товаров)`));
      } else if (visibleCategoryIds.length > 0) {
        // Только видимые категории + виртуальная категория "Все товары"
        const visibleCategories = allCategories.filter(category => visibleCategoryIds.includes(category.id));
        categories = [allProductsCategory, ...visibleCategories];
        console.log(`Загружено ${categories.length} из ${allCategories.length} категорий (видимые):`, categories.map(c => `${c.name} (${c.productCount} товаров)`));
      } else {
        // Нет видимых категорий, но показываем виртуальную категорию "Все товары"
        categories = [allProductsCategory];
        console.log('Нет видимых категорий, возвращаем только "Все товары"');
      }
      
      return categories;
    } catch (error) {
      console.error('Ошибка при получении категорий:', error.message);
      if (error.response) {
        console.error('Статус ответа:', error.response.status);
        console.error('Данные ответа:', error.response.data);
      }
      
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
      
      // В случае других ошибок тоже возвращаем виртуальную категорию
      console.log('Возвращаем виртуальную категорию "Все товары" из-за ошибки');
      return [{
        id: 'all',
        name: 'Все товары',
        description: 'Все доступные товары',
        pathName: 'Все товары',
        productCount: 0
      }];
    }
  }

  // Получение всех категорий (для админки)
  async getAllCategories() {
    try {
      const client = this.createAuthenticatedClient();
      const response = await this.executeRequest(() => client.get('/entity/productfolder', {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      }));
      
      // Обрабатываем категории для более удобного использования
      const categories = response.data.rows.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        pathName: category.pathName || category.name,
        productCount: 0 // Заполним позже
      }));
      
      console.log(`Загружено ${categories.length} категорий (все)`);

      // Получаем количество товаров для всех категорий (с ограничением)
      if (categories.length <= 20) {
        // Временно отключаем подсчёт для избежания ошибок 412
        console.log('Отключаем подсчёт товаров в категориях для избежания ошибок 412');
        categories.forEach(category => {
          category.productCount = '~'; // Показываем что товары есть, но количество неизвестно
        });
      } else {
        console.log(`Слишком много категорий (${categories.length}), отключаем подсчёт для избежания ошибок 412`);
        // Отключаем подсчёт для всех категорий
        categories.forEach(category => {
          category.productCount = '~'; // Показываем что товары есть, но количество неизвестно
        });
      }
      
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
      const response = await this.executeRequest(() => client.get(`/entity/product/${id}`, {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      }));
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
      const response = await this.executeRequest(() => client.get(`/entity/product/${productId}/images`, {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      }));
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

      if (!image) {
        console.log(`Изображение ${imageId} не найдено для товара ${productId}`);
        return null;
      }

      // Получаем бинарные данные изображения
      const client = this.createAuthenticatedClient();
      const imageResponse = await this.executeRequest(() => client.get(`/entity/product/${productId}/images/${imageId}`, {
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/*'
        }
      }));

      const imageBuffer = Buffer.from(imageResponse.data);
      imageCache.set(cacheKey, imageBuffer);
      
      // Ограничиваем размер кэша
      if (imageCache.size > 100) {
        const firstKey = imageCache.keys().next().value;
        imageCache.delete(firstKey);
      }

      return imageBuffer;
    } catch (error) {
      console.error(`Ошибка при получении изображения ${imageId} для товара ${productId}:`, error.message);
      return null;
    }
  }

  // Получение товаров с изображениями
  async getProductsWithImages(page = 1, limit = 100, categoryId = null, search = null) {
    try {
      console.log(`getProductsWithImages called with: page=${page}, limit=${limit}, categoryId=${categoryId}, search=${search}`);
      
      const productsData = await this.getProducts(page, limit, categoryId, search);
      
      console.log(`getProducts returned: ${productsData.products.length} products, total: ${productsData.total}`);
      
      // getProducts уже возвращает обработанные данные, просто возвращаем их
      return productsData;
    } catch (error) {
      console.error('Error in getProductsWithImages:', error.message);
      throw error;
    }
  }

  // Получение всех товаров с изображениями (для тестирования)
  async getAllProductsWithImages(limit = 100) {
    try {
      console.log(`Загружаем все товары с лимитом ${limit}...`);
      
      const client = this.createAuthenticatedClient();
      const response = await this.executeRequest(() => client.get(`/entity/product?limit=${limit}`, {
        headers: {
          'Accept': 'application/json;charset=utf-8'
        }
      }));
      
      const products = response.data.rows;
      const totalProducts = response.data.meta.size;
      
      console.log(`Получено ${products.length} товаров из ${totalProducts} всего`);
      
      // Обрабатываем товары
      const processedProducts = products.map(product => {
        // Извлекаем информацию о категории
        let categoryId = null;
        let categoryName = null;
        
        if (product.productFolder) {
          categoryId = product.productFolder.meta.href.split('/').pop();
          categoryName = product.productFolder.name || 'Без названия';
        }

        // Извлекаем цену
        let price = 0;
        if (product.salePrices && product.salePrices.length > 0) {
          // Ищем первую ненулевую цену
          const nonZeroPrice = product.salePrices.find(p => p.value > 0);
          if (nonZeroPrice) {
            price = nonZeroPrice.value / 100; // Цена в копейках
          }
        }

        return {
          id: product.id,
          name: product.name,
          code: product.code || '',
          description: product.description || '',
          price: price,
          categoryId: categoryId,
          categoryName: categoryName,
          pathName: product.pathName || '',
          hasImages: product.images && product.images.meta && product.images.meta.size > 0,
          imageCount: product.images && product.images.meta ? product.images.meta.size : 0,
          archived: product.archived || false,
          updated: product.updated || ''
        };
      });

      return {
        products: processedProducts,
        total: totalProducts,
        hasMore: products.length < totalProducts
      };
    } catch (error) {
      console.error('Error in getAllProductsWithImages:', error.message);
      throw error;
    }
  }

  // Загрузка товаров батчами для больших объемов данных
  async loadProductsInBatches(limit, totalProducts) {
    const batches = [];
    const batchSize = Math.min(limit, 100); // Максимум 100 товаров за запрос
    
    for (let offset = 0; offset < totalProducts; offset += batchSize) {
      const currentLimit = Math.min(batchSize, totalProducts - offset);
      batches.push({ offset, limit: currentLimit });
    }
    
    console.log(`Загружаем ${totalProducts} товаров в ${batches.length} батчах`);
    
    const allProducts = [];
    
    for (let i = 0; i < batches.length; i++) {
      const { offset, limit } = batches[i];
      console.log(`Загружаем батч ${i + 1}/${batches.length} (offset: ${offset}, limit: ${limit})`);
      
      try {
        const client = this.createAuthenticatedClient();
        const response = await this.executeRequest(() => client.get(`/entity/product?limit=${limit}&offset=${offset}`, {
          headers: {
            'Accept': 'application/json;charset=utf-8'
          }
        }));
        
        allProducts.push(...response.data.rows);
        
        // Небольшая задержка между батчами
        if (i < batches.length - 1) {
          await this.delay(100);
        }
      } catch (error) {
        console.error(`Ошибка при загрузке батча ${i + 1}:`, error.message);
        // Продолжаем с следующим батчем
      }
    }
    
    return allProducts;
  }

  // Получение товаров с изображениями с пагинацией
  async getProductsWithImagesPaginated(page = 1, limit = 100, categoryId = null, search = null) {
    try {
      console.log(`Загружаем товары: страница ${page}, лимит ${limit}, категория: ${categoryId || 'все'}, поиск: ${search || 'нет'}`);
      
      const productsData = await this.getProductsWithImages(page, limit, categoryId, search);
      
      console.log(`Получено ${productsData.products.length} товаров из ${productsData.total} всего`);
      
      return productsData;
    } catch (error) {
      console.error('Error in getProductsWithImagesPaginated:', error.message);
      throw error;
    }
  }

  // Обработка ответа с товарами
  async processProductsResponse(response, page, limit, categoryId = null) {
    try {
      const products = response.data.rows || [];
      const total = response.data.meta && response.data.meta.size ? response.data.meta.size : products.length;
      
      console.log(`Обрабатываем ${products.length} товаров из ${total} всего`);
      
      // Обрабатываем товары для добавления информации о категориях
      const processedProducts = products.map(product => {
        // Извлекаем информацию о категории
        let categoryId = null;
        let categoryName = null;
        
        if (product.productFolder) {
          categoryId = product.productFolder.meta.href.split('/').pop();
          categoryName = product.productFolder.name || 'Без названия';
        }

        // Извлекаем цену
        let price = 0;
        if (product.salePrices && product.salePrices.length > 0) {
          // Ищем первую ненулевую цену
          const nonZeroPrice = product.salePrices.find(p => p.value > 0);
          if (nonZeroPrice) {
            price = nonZeroPrice.value / 100; // Цена в копейках
          }
        }

        return {
          id: product.id,
          name: product.name,
          code: product.code || '',
          description: product.description || '',
          price: price,
          categoryId: categoryId,
          categoryName: categoryName,
          pathName: product.pathName || '',
          hasImages: product.images && product.images.meta && product.images.meta.size > 0,
          imageCount: product.images && product.images.meta ? product.images.meta.size : 0,
          archived: product.archived || false,
          updated: product.updated || ''
        };
      });

      const hasMore = (page * limit) < total;
      
      return {
        products: processedProducts,
        total: total,
        page: page,
        limit: limit,
        hasMore: hasMore
      };
    } catch (error) {
      console.error('Error in processProductsResponse:', error.message);
      throw error;
    }
  }

  // Тестовые данные для разработки
  getTestProducts(page = 1, limit = 20) {
    const testProducts = [];
    const startIndex = (page - 1) * limit;
    
    for (let i = 0; i < limit; i++) {
      const productIndex = startIndex + i;
      testProducts.push({
        id: `test-${productIndex}`,
        name: `Тестовый товар ${productIndex + 1}`,
        code: `TEST-${productIndex + 1}`,
        description: `Описание тестового товара ${productIndex + 1}`,
        price: Math.floor(Math.random() * 1000) + 100,
        categoryId: `category-${Math.floor(Math.random() * 5) + 1}`,
        categoryName: `Категория ${Math.floor(Math.random() * 5) + 1}`,
        pathName: `Тестовая категория ${Math.floor(Math.random() * 5) + 1}`,
        hasImages: Math.random() > 0.5,
        imageCount: Math.floor(Math.random() * 3),
        archived: false,
        updated: new Date().toISOString()
      });
    }
    
    return {
      products: testProducts,
      total: 100,
      page: page,
      limit: limit,
      hasMore: (page * limit) < 100
    };
  }

  // Получение заглушки изображения
  async getPlaceholderImage(productId) {
    try {
      // Создаем SVG заглушку с названием товара
      const svg = `
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle" dy=".3em">
            Изображение товара
          </text>
          <text x="50%" y="70%" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle" dy=".3em">
            ID: ${productId}
          </text>
        </svg>
      `;
      
      return Buffer.from(svg, 'utf-8');
    } catch (error) {
      console.error('Error creating placeholder image:', error.message);
      return null;
    }
  }

  // Получение настроек категорий
  async getCategorySettings() {
    try {
      const settings = this.loadCategorySettings();
      console.log('Loaded category settings:', settings);
      return settings;
    } catch (error) {
      console.error('Error getting category settings:', error.message);
      return {};
    }
  }

  // Обновление настроек категорий
  async updateCategorySettings(categorySettings) {
    try {
      console.log('Updating category settings:', categorySettings);
      const success = this.saveCategorySettings(categorySettings);
      
      if (success) {
        console.log('Category settings updated successfully');
        return { success: true, message: 'Настройки категорий обновлены' };
      } else {
        console.error('Failed to save category settings');
        return { success: false, message: 'Ошибка при сохранении настроек' };
      }
    } catch (error) {
      console.error('Error updating category settings:', error.message);
      return { success: false, message: error.message };
    }
  }

  // Тестирование подключения к MoySklad
  async testConnection() {
    try {
      console.log('Testing connection to MoySklad...');
      
      const client = this.createAuthenticatedClient();
      
      // Тестируем доступ к товарам
      const productsResponse = await this.executeRequest(() => client.get('/entity/product?limit=1'));
      const productsCount = productsResponse.data.meta && productsResponse.data.meta.size ? productsResponse.data.meta.size : 0;
      
      // Тестируем доступ к категориям
      const categoriesResponse = await this.executeRequest(() => client.get('/entity/productfolder?limit=1'));
      const categoriesCount = categoriesResponse.data.meta && categoriesResponse.data.meta.size ? categoriesResponse.data.meta.size : 0;
      
      console.log(`Connection test successful: ${productsCount} products, ${categoriesCount} categories`);
      
      return {
        success: true,
        message: 'Подключение к MoySklad успешно',
        productsCount: productsCount,
        categoriesCount: categoriesCount,
        apiToken: this.apiToken ? 'Установлен' : 'Не установлен',
        accountId: this.accountId ? 'Установлен' : 'Не установлен'
      };
    } catch (error) {
      console.error('Connection test failed:', error.message);
      
      let errorMessage = 'Ошибка подключения к MoySklad';
      
      if (error.response && error.response.status === 401) {
        errorMessage = 'Неверный токен API';
      } else if (error.response && error.response.status === 403) {
        errorMessage = 'Нет доступа к API';
      } else if (error.response && error.response.status === 429) {
        errorMessage = 'Превышен лимит запросов';
      } else if (error.response && error.response.status === 412) {
        errorMessage = 'Ошибка предварительного условия (слишком частые запросы)';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышено время ожидания';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Ошибка сети';
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.message,
        status: error.response ? error.response.status : null,
        productsCount: 0,
        categoriesCount: 0,
        apiToken: this.apiToken ? 'Установлен' : 'Не установлен',
        accountId: this.accountId ? 'Установлен' : 'Не установлен'
      };
    }
  }

  // Получение списка видимых категорий
  getVisibleCategoryIds() {
    try {
      const settings = this.loadCategorySettings();
      if (settings.visibleCategories === null) {
        return null; // Все категории видимые
      }
      return settings.visibleCategories || [];
    } catch (error) {
      console.error('Error getting visible category IDs:', error.message);
      return [];
    }
  }

  // Проверка видимости категории
  isCategoryVisible(categoryId) {
    try {
      const visibleCategoryIds = this.getVisibleCategoryIds();
      if (visibleCategoryIds === null) {
        return true; // Все категории видимые
      }
      return visibleCategoryIds.includes(categoryId);
    } catch (error) {
      console.error('Error checking category visibility:', error.message);
      return false;
    }
  }

  // Сброс настроек категорий
  resetCategorySettings() {
    try {
      const defaultSettings = {
        visibleCategories: null, // null означает, что все категории видимые
        lastUpdated: new Date().toISOString()
      };
      
      const success = this.saveCategorySettings(defaultSettings);
      
      if (success) {
        console.log('Category settings reset to default');
        return { success: true, message: 'Настройки категорий сброшены' };
      } else {
        console.error('Failed to reset category settings');
        return { success: false, message: 'Ошибка при сбросе настроек' };
      }
    } catch (error) {
      console.error('Error resetting category settings:', error.message);
      return { success: false, message: error.message };
    }
  }
}

module.exports = MoyskladService; 