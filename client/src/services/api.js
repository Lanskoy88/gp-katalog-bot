import axios from 'axios';

// Автоматически определяем базовый URL
const getBaseURL = () => {
  // В продакшне используем текущий домен
  if (process.env.NODE_ENV === 'production') {
    return `${window.location.origin}/api`;
  }
  
  // В разработке используем переменную окружения или локальный туннель
  return process.env.REACT_APP_API_URL || 'https://gp-katalog-images.loca.lt/api';
};

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.data);
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.message, error.response?.data);
    throw error;
  }
);

// Интерцептор для запросов
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// API функции для работы с товарами
export const fetchProducts = async (params = {}) => {
  const { page = 1, limit = 20, categoryId, search } = params;
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (categoryId) {
    queryParams.append('categoryId', categoryId);
  }
  
  if (search) {
    queryParams.append('search', search);
  }
  
  return api.get(`/products?${queryParams.toString()}`);
};

// API функции для работы с категориями
export const fetchCategories = async () => {
  return api.get('/categories');
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
export const searchProducts = async (query, page = 1, limit = 20) => {
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