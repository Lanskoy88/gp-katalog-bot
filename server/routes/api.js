const express = require('express');
const MoyskladService = require('../services/moyskladService');

const router = express.Router();

// Создаем экземпляр сервиса
const moyskladService = new MoyskladService();

// Получение товаров с пагинацией
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 100, category, search } = req.query;
    
    const products = await moyskladService.getProductsWithImages(
      parseInt(page),
      parseInt(limit),
      category,
      search
    );
    
    res.json(products);
  } catch (error) {
    console.error('Error in /products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Получение всех категорий (включая скрытые - для админки)
router.get('/all-categories', async (req, res) => {
  try {
    const categories = await moyskladService.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error in /all-categories:', error);
    res.status(500).json({ error: 'Failed to fetch all categories' });
  }
});

// Получение всех категорий
router.get('/categories', async (req, res) => {
  try {
    const categories = await moyskladService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error in /categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Получение информации о видимых категориях
router.get('/visible-categories', async (req, res) => {
  try {
    const categories = await moyskladService.getCategories();
    const visibleCategoryIds = moyskladService.getVisibleCategoryIds();
    
    res.json({
      categories: categories,
      visibleCount: categories.length,
      totalVisibleIds: visibleCategoryIds ? visibleCategoryIds.length : 'all',
      visibleIds: visibleCategoryIds,
      hasSettings: visibleCategoryIds !== null,
      message: visibleCategoryIds === null ? 'Все категории видимые' : `Видимых категорий: ${visibleCategoryIds.length}`
    });
  } catch (error) {
    console.error('Error in /visible-categories:', error);
    res.status(500).json({ error: 'Failed to fetch visible categories info' });
  }
});

// Получение настроек категорий
router.get('/category-settings', async (req, res) => {
  try {
    const settings = await moyskladService.getCategorySettings();
    res.json(settings);
  } catch (error) {
    console.error('Error in /category-settings:', error);
    res.status(500).json({ error: 'Failed to fetch category settings' });
  }
});

// Обновление настроек категорий
router.put('/category-settings', async (req, res) => {
  try {
    const result = await moyskladService.updateCategorySettings(req.body.settings);
    res.json(result);
  } catch (error) {
    console.error('Error in PUT /category-settings:', error);
    res.status(500).json({ error: 'Failed to update category settings' });
  }
});

// Обновление настроек категорий (POST для обратной совместимости)
router.post('/category-settings', async (req, res) => {
  try {
    const result = await moyskladService.updateCategorySettings(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in POST /category-settings:', error);
    res.status(500).json({ error: 'Failed to update category settings' });
  }
});

// Получение конкретного товара
router.get('/products/:id', async (req, res) => {
  try {
    const product = await moyskladService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    console.error('Error in /products/:id:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Получение заглушки изображения
router.get('/images/placeholder/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    console.log('Requesting placeholder for productId:', productId);
    
    const placeholderData = await moyskladService.getPlaceholderImage(productId);
    console.log('Placeholder data received:', placeholderData ? 'Buffer' : 'null');
    
    if (placeholderData) {
      res.set('Content-Type', 'image/svg+xml');
      res.set('Cache-Control', 'public, max-age=3600'); // Кэшируем на 1 час
      res.send(placeholderData);
    } else {
      console.error('Placeholder data is null for productId:', productId);
      res.status(404).json({ error: 'Placeholder not found' });
    }
  } catch (error) {
    console.error('Error in /images/placeholder/:productId:', error);
    res.status(500).json({ error: 'Failed to fetch placeholder' });
  }
});

// Получение изображения товара
router.get('/images/:productId/:imageId', async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    const imageData = await moyskladService.getProductImage(productId, imageId);
    
    if (imageData) {
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=3600'); // Кэшируем на 1 час
      res.send(imageData);
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error in /images/:productId/:imageId:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Проверка наличия изображений у товара
router.get('/products/:productId/images', async (req, res) => {
  try {
    const { productId } = req.params;
    const images = await moyskladService.getProductImages(productId);
    
    console.log(`Структура изображений для товара ${productId}:`, JSON.stringify(images, null, 2));
    
    if (images && images.length > 0) {
      res.json({
        hasImages: true,
        images: images.map(img => {
          console.log(`Обработка изображения:`, JSON.stringify(img, null, 2));
          // MoySklad может использовать разные поля для ID изображения
          const imageId = img.id || (img.meta && img.meta.href && img.meta.href.split('/').pop()) || img.filename || 'unknown';
          return {
            id: imageId,
            url: `/api/images/${productId}/${imageId}`
          };
        })
      });
    } else {
      res.json({
        hasImages: false,
        images: []
      });
    }
  } catch (error) {
    console.error('Error in /products/:productId/images:', error);
    res.json({
      hasImages: false,
      images: []
    });
  }
});

// Диагностика подключения к MoySklad
router.get('/diagnostics', async (req, res) => {
  try {
    const diagnostics = await moyskladService.testConnection();
    res.json(diagnostics);
  } catch (error) {
    console.error('Error in /diagnostics:', error);
    res.status(500).json({ 
      error: 'Failed to run diagnostics',
      message: error.message 
    });
  }
});

// Тестовый endpoint для получения сырых данных товара от MoySklad API
router.get('/test-raw-product', async (req, res) => {
  try {
    const client = moyskladService.createAuthenticatedClient();
    const response = await client.get('/entity/product?limit=1');
    
    if (response.data && response.data.rows && response.data.rows.length > 0) {
      const rawProduct = response.data.rows[0];
      res.json({
        success: true,
        rawProduct: rawProduct,
        productFolder: rawProduct.productFolder,
        hasProductFolder: !!rawProduct.productFolder,
        productFolderId: rawProduct.productFolder ? rawProduct.productFolder.id : null,
        productFolderName: rawProduct.productFolder ? rawProduct.productFolder.name : null,
        allFields: Object.keys(rawProduct)
      });
    } else {
      res.json({
        success: false,
        message: 'No products found'
      });
    }
  } catch (error) {
    console.error('Error in /test-raw-product:', error);
    res.status(500).json({ 
      error: 'Failed to fetch raw product data',
      message: error.message 
    });
  }
});

// Поиск товаров
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 100 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Параметр поиска обязателен' });
    }
    
    const products = await moyskladService.getProductsWithImages(
      parseInt(page),
      parseInt(limit),
      null,
      q
    );
    
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Ошибка при поиске товаров' });
  }
});

// Статистика каталога
router.get('/stats', async (req, res) => {
  try {
    const categories = await moyskladService.getCategories();
    const allCategories = await moyskladService.getAllCategories();
    const products = await moyskladService.getProducts(1, 1);
    const visibleCategoryIds = moyskladService.getVisibleCategoryIds();
    
    const stats = {
      categoriesCount: categories.length,
      allCategoriesCount: allCategories.length,
      productsCount: products.total,
      visibleCategoriesCount: visibleCategoryIds ? visibleCategoryIds.length : allCategories.length,
      hasCategorySettings: visibleCategoryIds !== null,
      lastUpdated: new Date().toISOString(),
      message: visibleCategoryIds === null 
        ? 'Все категории видимые' 
        : `Видимых категорий: ${visibleCategoryIds.length} из ${allCategories.length}`
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Ошибка при загрузке статистики' });
  }
});

// Проверка подключения к МойСклад
router.get('/test-connection', async (req, res) => {
  try {
    const result = await moyskladService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Error in /test-connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Проверка здоровья API
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Moysklad Catalog API'
  });
});

// Сброс настроек категорий
router.post('/reset-category-settings', async (req, res) => {
  try {
    const result = await moyskladService.resetCategorySettings();
    res.json(result);
  } catch (error) {
    console.error('Error in /reset-category-settings:', error);
    res.status(500).json({ error: 'Failed to reset category settings' });
  }
});

module.exports = router;
