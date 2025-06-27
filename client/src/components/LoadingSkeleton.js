import React from 'react';

const LoadingSkeleton = ({ count = 6 }) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div key={index} className="product-card skeleton">
      <div className="product-image loading-skeleton"></div>
      <div className="product-info">
        <div className="product-name loading-skeleton" style={{ height: '16px', marginBottom: '8px' }}></div>
        <div className="product-name loading-skeleton" style={{ height: '16px', marginBottom: '8px', width: '70%' }}></div>
        <div className="product-price loading-skeleton" style={{ height: '20px', width: '60%' }}></div>
      </div>
    </div>
  ));

  return (
    <div className="products-grid">
      {skeletons}
    </div>
  );
};

export default LoadingSkeleton; 