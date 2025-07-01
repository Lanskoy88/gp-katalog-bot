import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Search, Package, Filter } from 'lucide-react';
import ProductCard from './ProductCard';
import CategoryFilter from './CategoryFilter';
import LoadingSkeleton from './LoadingSkeleton';
import { fetchProducts, fetchCategories } from '../services/api';

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

  // Получение категорий при загрузке
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await fetchCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Загрузка товаров
  const loadProducts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const productsData = await fetchProducts({
        page: pageNum,
        limit: 200, // Увеличиваем лимит для загрузки большего количества товаров
        categoryId: selectedCategory || null,
        search: searchQuery || null
      });

      if (reset) {
        setProducts(productsData.products);
        setPage(1);
      } else {
        setProducts(prev => [...prev, ...productsData.products]);
      }
      
      setHasMore(productsData.hasMore);
      setPage(pageNum + 1);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Ошибка при загрузке товаров');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  // Первоначальная загрузка
  useEffect(() => {
    loadProducts(1, true);
  }, [selectedCategory, searchQuery]);

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
  const loadMore = () => {
    if (!loading && hasMore) {
      loadProducts(page);
    }
  };

  // Отправка данных в Telegram
  useEffect(() => {
    if (tg && products.length > 0) {
      tg.sendData(JSON.stringify({
        action: 'catalog_opened',
        productsCount: products.length,
        category: selectedCategory,
        search: searchQuery
      }));
    }
  }, [tg, products.length, selectedCategory, searchQuery]);

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
          <h1>Каталог товаров {products.length > 0 && `(${products.length})`}</h1>
          
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
          loader={<LoadingSkeleton count={6} />}
          endMessage={
            <div className="load-more">
              <p>Все товары загружены ({products.length} товаров)</p>
            </div>
          }
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
              {searchQuery 
                ? `По запросу "${searchQuery}" ничего не найдено`
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