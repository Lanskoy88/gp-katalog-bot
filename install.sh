#!/bin/bash

echo "🚀 Установка Telegram Bot с каталогом товаров МойСклад"
echo "=================================================="

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Пожалуйста, установите Node.js 16+"
    exit 1
fi

# Проверка версии Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Требуется Node.js версии 16 или выше. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js версии $(node -v) найден"

# Установка зависимостей сервера
echo "📦 Установка зависимостей сервера..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при установке зависимостей сервера"
    exit 1
fi

# Установка зависимостей клиента
echo "📦 Установка зависимостей клиента..."
cd client
npm install

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при установке зависимостей клиента"
    exit 1
fi

# Сборка клиента
echo "🔨 Сборка клиентского приложения..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при сборке клиентского приложения"
    exit 1
fi

cd ..

echo "✅ Установка завершена успешно!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Создайте файл .env на основе env.example"
echo "2. Настройте переменные окружения"
echo "3. Запустите приложение: npm run dev"
echo ""
echo "📖 Подробные инструкции см. в README.md" 