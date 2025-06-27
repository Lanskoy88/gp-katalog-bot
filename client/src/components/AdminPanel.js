import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Save, RefreshCw, TestTube } from 'lucide-react';
import { fetchCategorySettings, updateCategorySettings, fetchStats, testMoyskladConnection } from '../services/api';

const AdminPanel = ({ tg }) => {
  const [categorySettings, setCategorySettings] = useState([]);
  const [stats, setStats] = useState(null);
  const [connectionTest, setConnectionTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка настроек категорий
  useEffect(() => {
    loadCategorySettings();
    loadStats();
  }, []);

  const loadCategorySettings = async () => {
    try {
      setLoading(true);
      const settings = await fetchCategorySettings();
      setCategorySettings(settings);
    } catch (error) {
      console.error('Error loading category settings:', error);
      setError('Ошибка при загрузке настроек категорий');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await fetchStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Тестирование подключения к МойСклад
  const testConnection = async () => {
    try {
      setTesting(true);
      const result = await testMoyskladConnection();
      setConnectionTest(result);
      
      if (tg) {
        if (result.success) {
          tg.showAlert(`✅ Подключение успешно!\nAccount ID: ${result.accountId}\nТоваров: ${result.productsCount}`);
        } else {
          tg.showAlert(`❌ Ошибка подключения: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionTest({ success: false, error: error.message });
      
      if (tg) {
        tg.showAlert(`❌ Ошибка тестирования: ${error.message}`);
      }
    } finally {
      setTesting(false);
    }
  };

  // Переключение видимости категории
  const toggleCategoryVisibility = (categoryId) => {
    setCategorySettings(prev => 
      prev.map(category => 
        category.id === categoryId 
          ? { ...category, visible: !category.visible }
          : category
      )
    );
  };

  // Сохранение настроек
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateCategorySettings(categorySettings);
      
      if (tg) {
        tg.showAlert('Настройки успешно сохранены!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Ошибка при сохранении настроек');
      
      if (tg) {
        tg.showAlert('Ошибка при сохранении настроек');
      }
    } finally {
      setSaving(false);
    }
  };

  // Отправка данных в Telegram
  useEffect(() => {
    if (tg) {
      tg.sendData(JSON.stringify({
        action: 'admin_panel_opened',
        settingsCount: categorySettings.length,
        visibleCategories: categorySettings.filter(c => c.visible).length
      }));
    }
  }, [tg, categorySettings.length]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading-message">
          <RefreshCw size={32} className="loading-spinner" />
          <p>Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <h3>Ошибка</h3>
          <p>{error}</p>
          <button 
            className="load-more-button"
            onClick={loadCategorySettings}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <header className="header">
        <div className="container">
          <h1>Панель управления</h1>
          <p>Управление видимостью категорий товаров</p>
        </div>
      </header>

      <div className="container">
        {/* Тестирование подключения */}
        <div className="connection-test-section">
          <div className="connection-test-header">
            <h3>Подключение к МойСклад</h3>
            <button
              className="test-button"
              onClick={testConnection}
              disabled={testing}
            >
              <TestTube size={16} />
              {testing ? 'Тестирование...' : 'Тестировать подключение'}
            </button>
          </div>
          
          {connectionTest && (
            <div className={`connection-result ${connectionTest.success ? 'success' : 'error'}`}>
              {connectionTest.success ? (
                <div>
                  <p>✅ Подключение успешно</p>
                  <p>Account ID: {connectionTest.accountId}</p>
                  <p>Товаров в каталоге: {connectionTest.productsCount}</p>
                </div>
              ) : (
                <div>
                  <p>❌ Ошибка подключения</p>
                  <p>{connectionTest.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Статистика */}
        {stats && (
          <div className="stats-section">
            <h3>Статистика каталога</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{stats.categoriesCount}</span>
                <span className="stat-label">Категорий</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.productsCount}</span>
                <span className="stat-label">Товаров</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {categorySettings.filter(c => c.visible).length}
                </span>
                <span className="stat-label">Видимых категорий</span>
              </div>
            </div>
          </div>
        )}

        {/* Настройки категорий */}
        <div className="settings-section">
          <div className="settings-header">
            <h3>Настройки категорий</h3>
            <button
              className="save-button"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <div className="category-settings-list">
            {categorySettings.map((category) => (
              <div key={category.id} className="category-setting-item">
                <div className="category-info">
                  <span className="category-name">{category.name}</span>
                  <span className="category-status">
                    {category.visible ? 'Видима' : 'Скрыта'}
                  </span>
                </div>
                
                <button
                  className={`visibility-toggle ${category.visible ? 'visible' : 'hidden'}`}
                  onClick={() => toggleCategoryVisibility(category.id)}
                  title={category.visible ? 'Скрыть категорию' : 'Показать категорию'}
                >
                  {category.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            ))}
          </div>

          {categorySettings.length === 0 && (
            <div className="empty-settings">
              <p>Категории не найдены</p>
            </div>
          )}
        </div>

        {/* Инструкции */}
        <div className="instructions-section">
          <h3>Инструкции</h3>
          <ul>
            <li>Сначала протестируйте подключение к МойСклад</li>
            <li>Используйте переключатели для показа/скрытия категорий</li>
            <li>Скрытые категории не будут отображаться пользователям</li>
            <li>Не забудьте сохранить изменения</li>
            <li>Настройки применяются сразу после сохранения</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 