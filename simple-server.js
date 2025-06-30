const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Простые тестовые endpoints для админ панели
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Simple Test Server'
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    categoriesCount: 5,
    productsCount: 150,
    lastUpdated: new Date().toISOString()
  });
});

app.get('/api/category-settings', (req, res) => {
  res.json([
    { id: '1', name: 'Электроника', visible: true },
    { id: '2', name: 'Одежда', visible: true },
    { id: '3', name: 'Книги', visible: false },
    { id: '4', name: 'Спорт', visible: true },
    { id: '5', name: 'Дом и сад', visible: true }
  ]);
});

app.put('/api/category-settings', (req, res) => {
  console.log('Обновление настроек:', req.body);
  res.json({ success: true, message: 'Настройки обновлены' });
});

app.post('/api/category-settings', (req, res) => {
  console.log('Обновление настроек (POST):', req.body);
  res.json({ success: true, message: 'Настройки обновлены' });
});

app.get('/api/test-connection', (req, res) => {
  res.json({
    success: true,
    accountId: 'test-account-123',
    productsCount: 150
  });
});

app.post('/api/reset-category-settings', (req, res) => {
  res.json({ success: true, message: 'Настройки сброшены' });
});

// Serve React app for all routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client/build/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ 
      message: 'Simple Test Server is running',
      status: 'Client build not found, but API is working',
      adminPanel: 'http://localhost:3001/admin'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Простой тестовый сервер запущен на порту ${PORT}`);
  console.log(`📊 Админ панель доступна по адресу: http://localhost:${PORT}/admin`);
  console.log(`🔧 API endpoints:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - GET  /api/stats`);
  console.log(`   - GET  /api/category-settings`);
  console.log(`   - PUT  /api/category-settings`);
  console.log(`   - GET  /api/test-connection`);
  console.log(`   - POST /api/reset-category-settings`);
}); 