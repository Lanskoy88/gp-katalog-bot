const moyskladService = require('../services/moyskladService');

class BotHandlers {
  setup(bot) {
    // Обработка команды /start
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from.first_name;
      
      const welcomeMessage = `Привет, ${username}! 👋\n\nДобро пожаловать в наш каталог товаров! Здесь вы можете просматривать все доступные товары с ценами и изображениями.`;
      
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🛍️ Открыть каталог',
              web_app: {
                url: `${process.env.BASE_URL || 'http://localhost:3000'}/catalog`
              }
            }
          ],
          [
            {
              text: '📋 Категории товаров',
              callback_data: 'categories'
            }
          ],
          [
            {
              text: '🔍 Поиск товаров',
              callback_data: 'search'
            }
          ]
        ]
      };

      await bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    });

    // Обработка команды /catalog
    bot.onText(/\/catalog/, async (msg) => {
      const chatId = msg.chat.id;
      
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🛍️ Открыть каталог',
              web_app: {
                url: `${process.env.BASE_URL || 'http://localhost:3000'}/catalog`
              }
            }
          ]
        ]
      };

      await bot.sendMessage(chatId, 'Откройте каталог товаров:', {
        reply_markup: keyboard
      });
    });

    // Обработка команды /admin (только для администраторов)
    bot.onText(/\/admin/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Проверка на администратора (в реальном приложении должна быть проверка по базе данных)
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
      
      if (!adminIds.includes(userId.toString())) {
        await bot.sendMessage(chatId, 'У вас нет доступа к административной панели.');
        return;
      }

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '⚙️ Панель управления',
              web_app: {
                url: `${process.env.BASE_URL || 'http://localhost:3000'}/admin`
              }
            }
          ],
          [
            {
              text: '📊 Статистика',
              callback_data: 'admin_stats'
            }
          ]
        ]
      };

      await bot.sendMessage(chatId, 'Панель администратора:', {
        reply_markup: keyboard
      });
    });

    // Обработка callback запросов
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      switch (data) {
        case 'categories':
          await this.handleCategories(chatId, bot);
          break;
        case 'search':
          await this.handleSearch(chatId, bot);
          break;
        case 'admin_stats':
          await this.handleAdminStats(chatId, bot);
          break;
        default:
          if (data.startsWith('category_')) {
            const categoryId = data.replace('category_', '');
            await this.handleCategorySelection(chatId, categoryId, bot);
          }
      }

      // Отвечаем на callback query
      await bot.answerCallbackQuery(callbackQuery.id);
    });

    // Обработка web app данных
    bot.on('web_app_data', async (msg) => {
      const chatId = msg.chat.id;
      const data = msg.web_app_data.data;
      
      try {
        const parsedData = JSON.parse(data);
        console.log('Web app data received:', parsedData);
        
        // Обработка данных от мини-приложения
        if (parsedData.action === 'product_viewed') {
          await bot.sendMessage(chatId, `Вы просмотрели товар: ${parsedData.productName}`);
        }
      } catch (error) {
        console.error('Error parsing web app data:', error);
      }
    });

    // Обработка ошибок
    bot.on('error', (error) => {
      console.error('Bot error:', error);
    });

    // Обработка polling ошибок
    bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });
  }

  // Обработка показа категорий
  async handleCategories(chatId, bot) {
    try {
      const categories = await moyskladService.getCategories();
      
      const keyboard = {
        inline_keyboard: categories.slice(0, 10).map(category => [
          {
            text: category.name,
            callback_data: `category_${category.id}`
          }
        ])
      };

      await bot.sendMessage(chatId, 'Выберите категорию товаров:', {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error handling categories:', error);
      await bot.sendMessage(chatId, 'Ошибка при загрузке категорий. Попробуйте позже.');
    }
  }

  // Обработка выбора категории
  async handleCategorySelection(chatId, categoryId, bot) {
    try {
      const products = await moyskladService.getProductsWithImages(1, 5, categoryId);
      
      if (products.products.length === 0) {
        await bot.sendMessage(chatId, 'В этой категории пока нет товаров.');
        return;
      }

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🛍️ Открыть каталог',
              web_app: {
                url: `${process.env.BASE_URL || 'http://localhost:3000'}/catalog?category=${categoryId}`
              }
            }
          ]
        ]
      };

      const message = `Найдено товаров: ${products.total}\n\nПоказано: ${products.products.length}`;
      
      await bot.sendMessage(chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error handling category selection:', error);
      await bot.sendMessage(chatId, 'Ошибка при загрузке товаров категории.');
    }
  }

  // Обработка поиска
  async handleSearch(chatId, bot) {
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🔍 Открыть поиск',
            web_app: {
              url: `${process.env.BASE_URL || 'http://localhost:3000'}/catalog?search=true`
            }
          }
        ]
      ]
    };

    await bot.sendMessage(chatId, 'Откройте поиск товаров:', {
      reply_markup: keyboard
    });
  }

  // Обработка статистики администратора
  async handleAdminStats(chatId, bot) {
    try {
      const categories = await moyskladService.getCategories();
      const products = await moyskladService.getProducts(1, 1);
      
      const stats = `📊 Статистика каталога:\n\n` +
                   `📁 Категорий: ${categories.length}\n` +
                   `🛍️ Товаров: ${products.total}\n` +
                   `📅 Обновлено: ${new Date().toLocaleString('ru-RU')}`;

      await bot.sendMessage(chatId, stats);
    } catch (error) {
      console.error('Error handling admin stats:', error);
      await bot.sendMessage(chatId, 'Ошибка при загрузке статистики.');
    }
  }
}

module.exports = new BotHandlers(); 