# 🚀 Быстрый старт админ панели

## Шаг 1: Запуск сервера
```bash
# Запустите простой тестовый сервер
node simple-server.js
```

## Шаг 2: Открытие админ панели
1. Откройте браузер
2. Перейдите по адресу: **http://localhost:3001/admin**

## Шаг 3: Проверка функций
✅ **Тестирование подключения** - нажмите "Тестировать подключение"  
✅ **Просмотр статистики** - проверьте количество категорий и товаров  
✅ **Управление категориями** - переключайте видимость категорий  
✅ **Сохранение настроек** - нажмите "Сохранить" после изменений  

## 🔧 Полезные команды

```bash
# Проверка состояния сервера
curl http://localhost:3001/api/health

# Просмотр статистики
curl http://localhost:3001/api/stats

# Просмотр настроек категорий
curl http://localhost:3001/api/category-settings

# Тестирование подключения
curl http://localhost:3001/api/test-connection
```

## 📱 Админ панель готова к использованию!

Теперь вы можете:
- Управлять видимостью категорий товаров
- Просматривать статистику каталога
- Тестировать подключение к МойСклад
- Сохранять настройки

---

**Примечание:** Это тестовая версия с мок-данными. Для работы с реальными данными МойСклад используйте основной сервер. 