import React from 'react';
import { X, Package } from 'lucide-react';

const CategoryFilter = ({ categories, selectedCategory, onCategorySelect, onReset }) => {
  const handleCategoryClick = (categoryId) => {
    if (selectedCategory === categoryId) {
      onCategorySelect(''); // Снимаем выбор если категория уже выбрана
    } else {
      onCategorySelect(categoryId);
    }
  };

  return (
    <div className="category-filter">
      <div className="container">
        <div className="category-filter-header">
          <h3>Категории товаров</h3>
          {selectedCategory && (
            <button 
              className="reset-button"
              onClick={onReset}
            >
              <X size={16} />
              Сбросить
            </button>
          )}
        </div>
        
        <div className="categories-container">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-chip ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category.id)}
            >
              <span className="category-name">{category.name}</span>
              {category.productCount > 0 && (
                <span className="category-count">
                  <Package size={12} />
                  {category.productCount}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {categories.length === 0 && (
          <div className="no-categories">
            <Package size={24} />
            <p>Категории не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryFilter; 