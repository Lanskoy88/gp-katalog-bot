#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.BASE_URL || 'https://gp-katalog-bot.onrender.com';

async function setupWebhook() {
    console.log('🔧 Настройка вебхука для Telegram бота...\n');
    
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения');
        process.exit(1);
    }
    
    const webhookUrl = `${BASE_URL}/webhook`;
    
    console.log(`📡 URL вебхука: ${webhookUrl}`);
    console.log(`🤖 Токен бота: ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
    
    try {
        // Удаляем старый вебхук
        console.log('\n🔄 Удаляем старый вебхук...');
        const deleteResponse = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`
        );
        
        if (deleteResponse.data.ok) {
            console.log('✅ Старый вебхук удален');
        }
        
        // Устанавливаем новый вебхук
        console.log('\n🔗 Устанавливаем новый вебхук...');
        const setResponse = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
            {
                url: webhookUrl,
                allowed_updates: [
                    'message',
                    'edited_message',
                    'callback_query',
                    'inline_query',
                    'chosen_inline_result'
                ],
                drop_pending_updates: true
            }
        );
        
        if (setResponse.data.ok) {
            console.log('✅ Вебхук успешно установлен!');
        } else {
            console.error('❌ Ошибка при установке вебхука:', setResponse.data);
        }
        
        // Проверяем статус вебхука
        console.log('\n🔍 Проверяем статус вебхука...');
        const infoResponse = await axios.get(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
        );
        
        if (infoResponse.data.ok) {
            const info = infoResponse.data.result;
            console.log('📊 Статус вебхука:');
            console.log(`   URL: ${info.url || 'не установлен'}`);
            console.log(`   Ожидающие обновления: ${info.pending_update_count}`);
            console.log(`   Разрешенные обновления: ${info.allowed_updates?.join(', ') || 'все'}`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка при настройке вебхука:', error.message);
        if (error.response) {
            console.error('Детали ошибки:', error.response.data);
        }
    }
}

async function removeWebhook() {
    console.log('🗑️ Удаление вебхука...\n');
    
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`
        );
        
        if (response.data.ok) {
            console.log('✅ Вебхук удален');
        } else {
            console.error('❌ Ошибка при удалении вебхука:', response.data);
        }
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

async function getWebhookInfo() {
    console.log('📊 Информация о вебхуке...\n');
    
    try {
        const response = await axios.get(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
        );
        
        if (response.data.ok) {
            const info = response.data.result;
            console.log('📋 Статус вебхука:');
            console.log(`   URL: ${info.url || 'не установлен'}`);
            console.log(`   Ожидающие обновления: ${info.pending_update_count}`);
            console.log(`   Разрешенные обновления: ${info.allowed_updates?.join(', ') || 'все'}`);
            console.log(`   Кастомный сертификат: ${info.has_custom_certificate ? 'да' : 'нет'}`);
        }
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

// Обработка аргументов командной строки
const command = process.argv[2];

switch (command) {
    case 'setup':
        setupWebhook();
        break;
    case 'remove':
        removeWebhook();
        break;
    case 'info':
        getWebhookInfo();
        break;
    default:
        console.log('🔧 Скрипт настройки вебхуков Telegram бота\n');
        console.log('Использование:');
        console.log('  node setup-webhook.js setup   - установить вебхук');
        console.log('  node setup-webhook.js remove  - удалить вебхук');
        console.log('  node setup-webhook.js info    - показать информацию о вебхуке');
        console.log('\nПеременные окружения:');
        console.log('  TELEGRAM_BOT_TOKEN - токен бота');
        console.log('  BASE_URL           - базовый URL (по умолчанию: https://gp-katalog-bot.onrender.com)');
} 