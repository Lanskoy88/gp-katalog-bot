import React, { useState, useEffect } from 'react';
import { Eye, Package } from 'lucide-react';
import { fetchProductImages } from '../services/api';

const ProductCard = ({ product, tg }) => {
  const [imageError, setImageError] = useState(false);
  const [realImageUrl, setRealImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Загрузка реального изображения при появлении карточки в viewport
  useEffect(() => {
    const loadRealImage = async () => {
      // Если у товара уже есть URL изображения из API, используем его
      if (product.imageUrl && product.imageUrl.includes('/api/images/') && !product.imageUrl.includes('/placeholder/')) {
        console.log(`Используем готовый URL изображения для товара ${product.id}:`, product.imageUrl);
        setRealImageUrl(product.imageUrl);
        return;
      }
      
      // Если у товара есть флаг hasImages = true, но нет URL, пробуем загрузить
      if (product.hasImages === true && !product.imageUrl && !loadingImage && !realImageUrl) {
        console.log(`Загружаем изображения для товара ${product.id}`);
        setLoadingImage(true);
        try {
          const imageData = await fetchProductImages(product.id);
          if (imageData.hasImages && imageData.images.length > 0) {
            const imageUrl = imageData.images[0].url;
            console.log(`Получен URL изображения для товара ${product.id}:`, imageUrl);
            setRealImageUrl(imageUrl);
          }
        } catch (error) {
          console.error('Не удалось загрузить изображение для товара:', product.id, error);
        } finally {
          setLoadingImage(false);
        }
      }
    };

    // Используем Intersection Observer для ленивой загрузки
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadRealImage();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const cardElement = document.querySelector(`[data-product-id="${product.id}"]`);
    if (cardElement) {
      observer.observe(cardElement);
    }

    return () => {
      if (cardElement) {
        observer.unobserve(cardElement);
      }
    };
  }, [product.id, product.hasImages, product.imageUrl, loadingImage, realImageUrl]);

  const handleImageError = () => {
    setImageError(true);
    setRealImageUrl(null);
  };

  const handleProductClick = () => {
    // Отправляем данные о просмотре товара в Telegram
    if (tg) {
      tg.sendData(JSON.stringify({
        action: 'product_viewed',
        productId: product.id,
        productName: product.name,
        productPrice: product.price
      }));
    }

    // Показываем детальную информацию о товаре
    showProductDetails();
  };

  const showProductDetails = () => {
    const details = `
🛍️ ${product.name}

💰 Цена: ${formatPrice(product.price)}
📦 Артикул: ${product.code || 'Не указан'}
📝 Описание: ${product.description || 'Описание отсутствует'}

${realImageUrl ? '🖼️ Изображение прилагается' : ''}
    `;

    if (tg) {
      tg.showAlert(details);
    } else {
      alert(details);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Цена не указана';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: product.currency || 'RUB',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Определяем URL изображения
  const imageUrl = realImageUrl || product.imageUrl;

  return (
    <div className="product-card" onClick={handleProductClick} data-product-id={product.id}>
      <div className="product-image-container">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="product-image"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="product-image-placeholder">
            <Package size={32} />
          </div>
        )}
        {loadingImage && (
          <div className="image-loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
      
      <div className="product-info">
        <h3 className="product-name" title={product.name}>
          {product.name}
        </h3>
        
        <div className="product-price">
          {formatPrice(product.price)}
        </div>
        
        {product.code && (
          <div className="product-code">
            Арт: {product.code}
          </div>
        )}
      </div>
      
      <div className="product-overlay">
        <Eye size={16} />
        <span>Подробнее</span>
      </div>
    </div>
  );
};

export default ProductCard; 