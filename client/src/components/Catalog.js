import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Search, Package, Filter } from 'lucide-react';
import ProductCard from './ProductCard';
import CategoryFilter from './CategoryFilter';
import LoadingSkeleton from './LoadingSkeleton';
import { fetchProducts, fetchCategories } from '../services/api';

// Хук для дебаунса
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const Catalog = ({ tg }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Дебаунс для поиска (500ms)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Получение категорий при загрузке
  useEffect(() => {
    const loadCategories = async () => {
      try {
        console.log('🔄 Загружаем категории...');
        const categoriesData = await fetchCategories();
        console.log(`✅ Загружено ${categoriesData.length || 0} категорий`);
        setCategories(categoriesData);
      } catch (error) {
        console.error('❌ Error loading categories:', error);
        // Не показываем ошибку для категорий, так как товары могут загрузиться без них
      }
    };
    loadCategories();
  }, []);

  // Загрузка товаров
  const loadProducts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }
      
      console.log(`🔄 Загружаем товары: страница ${pageNum}, категория: ${selectedCategory || 'все'}, поиск: ${debouncedSearchQuery || 'нет'}`);
      
      const productsData = await fetchProducts({
        page: pageNum,
        limit: 20, // Уменьшаем до 20 товаров для более быстрой загрузки
        categoryId: selectedCategory || null,
        search: debouncedSearchQuery || null
      });

      console.log(`✅ Загружено ${productsData.products?.length || 0} товаров`);

      if (reset) {
        setProducts(productsData.products || []);
        setPage(2); // Следующая страница будет 2
      } else {
        setProducts(prev => [...prev, ...(productsData.products || [])]);
        setPage(pageNum + 1);
      }
      
      setHasMore(productsData.hasMore);
    } catch (error) {
      console.error('❌ Error loading products:', error);
      
      let errorMessage = 'Ошибка при загрузке товаров';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Превышено время ожидания. Сервер может быть перегружен. Попробуйте позже.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Слишком много запросов. Подождите немного и попробуйте снова.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Ошибка сервера. Попробуйте позже.';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [selectedCategory, debouncedSearchQuery]);

  // Первоначальная загрузка и сброс при изменении фильтров
  useEffect(() => {
    loadProducts(1, true);
  }, [selectedCategory, debouncedSearchQuery]);

  // Обработка поиска
  const handleSearch = (query) => {
    setSearchQuery(query);
    setSearchParams({ search: query });
  };

  // Обработка выбора категории
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSearchParams({ category: categoryId });
  };

  // Обработка сброса фильтров
  const handleResetFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setSearchParams({});
  };

  // Загрузка следующей страницы
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !loading) {
      loadProducts(page);
    }
  }, [isLoadingMore, hasMore, loading, loadProducts, page]);

  // Отправка данных в Telegram
  useEffect(() => {
    if (tg && products.length > 0) {
      tg.sendData(JSON.stringify({
        action: 'catalog_opened',
        productsCount: products.length,
        category: selectedCategory,
        search: debouncedSearchQuery
      }));
    }
  }, [tg, products.length, selectedCategory, debouncedSearchQuery]);

  // Мемоизированный индикатор загрузки
  const loadingIndicator = useMemo(() => {
    if (loading) {
      return <LoadingSkeleton count={6} />;
    }
    if (isLoadingMore) {
      return <LoadingSkeleton count={4} />;
    }
    return null;
  }, [loading, isLoadingMore]);

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <Package size={48} />
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button 
            className="load-more-button"
            onClick={() => loadProducts(1, true)}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog">
      {/* Заголовок */}
      <header className="header">
        <div className="container">
          <h1>
            Каталог товаров 
            {loading && <span className="loading-indicator">🔄</span>}
            {products.length > 0 && `(${products.length})`}
          </h1>
          
          {/* Поиск */}
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchQuery !== debouncedSearchQuery && (
              <span className="search-indicator">🔍</span>
            )}
          </div>

          {/* Кнопка фильтров */}
          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
            Фильтры
          </button>
        </div>
      </header>

      {/* Фильтры категорий */}
      {showFilters && (
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          onReset={handleResetFilters}
        />
      )}

      {/* Список товаров */}
      <div className="container">
        <InfiniteScroll
          dataLength={products.length}
          next={loadMore}
          hasMore={hasMore}
          loader={loadingIndicator}
          endMessage={
            <div className="load-more">
              <p>Все товары загружены ({products.length} товаров)</p>
            </div>
          }
          scrollThreshold={0.8}
        >
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                tg={tg}
              />
            ))}
          </div>
        </InfiniteScroll>

        {/* Состояние пустого списка */}
        {!loading && products.length === 0 && (
          <div className="empty-state">
            <Package size={48} className="empty-state-icon" />
            <h3>Товары не найдены</h3>
            <p>
              {debouncedSearchQuery 
                ? `По запросу "${debouncedSearchQuery}" ничего не найдено`
                : 'В выбранной категории пока нет товаров'
              }
            </p>
            <button 
              className="load-more-button"
              onClick={handleResetFilters}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog; 