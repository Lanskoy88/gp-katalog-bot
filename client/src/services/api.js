import axios from 'axios';

// Простое кэширование
const cache = {
  categories: null,
  categoriesTimestamp: null,
  cacheTimeout: 5 * 60 * 1000 // 5 минут
};

// Автоматически определяем базовый URL
const getBaseURL = () => {
  // В продакшне используем Render URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://gp-katalog-bot.onrender.com/api';
  }
  
  // В разработке используем переменную окружения или Render URL как fallback
  return process.env.REACT_APP_API_URL || 'https://gp-katalog-bot.onrender.com/api';
};

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // Увеличиваем таймаут для Render
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.data);
    return response.data;
  },
  (error) => {
    console.error('API Error:', (error.config && error.config.url), error.message, (error.response && error.response.data));
    
    // Добавляем дополнительную информацию об ошибке
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - возможно, сервер перегружен');
    }
    
    throw error;
  }
);

// Интерцептор для запросов
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', (config.method && config.method.toUpperCase()), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// API функции для работы с товарами
export const fetchProducts = async (params = {}) => {
  const { page = 1, limit = 50, categoryId, search } = params;
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (categoryId) {
    queryParams.append('category', categoryId);
  }
  
  if (search) {
    queryParams.append('search', search);
  }
  
  return api.get(`/products?${queryParams.toString()}`);
};

// API функции для работы с категориями
export const fetchCategories = async () => {
  // Проверяем кэш
  const now = Date.now();
  if (cache.categories && cache.categoriesTimestamp && 
      (now - cache.categoriesTimestamp) < cache.cacheTimeout) {
    console.log('📦 Возвращаем категории из кэша');
    return cache.categories;
  }
  
  console.log('🔄 Загружаем категории с сервера...');
  const categories = await api.get('/categories');
  
  // Сохраняем в кэш
  cache.categories = categories;
  cache.categoriesTimestamp = now;
  
  return categories;
};

// API функции для работы с настройками категорий
export const fetchCategorySettings = async () => {
  return api.get('/category-settings');
};

export const updateCategorySettings = async (settings) => {
  return api.put('/category-settings', { settings });
};

// API функции для работы со статистикой
export const fetchStats = async () => {
  return api.get('/stats');
};

// API функции для поиска
export const searchProducts = async (query, page = 1, limit = 100) => {
  const queryParams = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: limit.toString(),
  });
  
  return api.get(`/search?${queryParams.toString()}`);
};

// API функции для получения конкретного товара
export const fetchProductById = async (id) => {
  return api.get(`/products/${id}`);
};

// API функции для получения изображения товара
export const fetchProductImage = async (productId, imageId) => {
  return api.get(`/products/${productId}/images/${imageId}`, {
    responseType: 'blob'
  });
};

// API функции для получения информации об изображениях товара
export const fetchProductImages = async (productId) => {
  return api.get(`/products/${productId}/images`);
};

// API функции для проверки подключения к МойСклад
export const testMoyskladConnection = async () => {
  return api.get('/test-connection');
};

// Проверка здоровья API
export const checkApiHealth = async () => {
  return api.get('/health');
};

export default api; 