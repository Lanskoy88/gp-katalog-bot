// Конфигурация базы данных (опционально)
// В текущей реализации настройки хранятся в памяти
// Для продакшена рекомендуется использовать базу данных

const mongoose = require('mongoose');

class Database {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/moysklad-catalog';
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      this.isConnected = true;
      console.log('✅ База данных подключена');
    } catch (error) {
      console.error('❌ Ошибка подключения к базе данных:', error);
      // Не прерываем работу приложения, если БД недоступна
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📴 База данных отключена');
    }
  }
}

// Схемы для MongoDB (если используется)
const categorySettingsSchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  visible: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

const CategorySettings = mongoose.model('CategorySettings', categorySettingsSchema);

module.exports = {
  Database: new Database(),
  CategorySettings
}; 