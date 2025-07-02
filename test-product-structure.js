const axios = require('axios');

async function testProductStructure() {
  try {
    const apiToken = process.env.MOYSKLAD_API_TOKEN;
    if (!apiToken) {
      console.error('MOYSKLAD_API_TOKEN не установлен');
      return;
    }

    console.log('Тестируем структуру данных товаров от MoySklad API...');
    
    const client = axios.create({
      baseURL: 'https://api.moysklad.ru/api/remap/1.2',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json;charset=utf-8',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Получаем один товар
    console.log('Получаем один товар...');
    const productResponse = await client.get('/entity/product?limit=1');
    
    if (productResponse.data && productResponse.data.rows && productResponse.data.rows.length > 0) {
      const product = productResponse.data.rows[0];
      
      console.log('\n=== СТРУКТУРА ТОВАРА ===');
      console.log('ID:', product.id);
      console.log('Название:', product.name);
      console.log('Код:', product.code);
      console.log('productFolder:', product.productFolder);
      console.log('hasProductFolder:', !!product.productFolder);
      
      if (product.productFolder) {
        console.log('productFolder.id:', product.productFolder.id);
        console.log('productFolder.name:', product.productFolder.name);
        console.log('productFolder.meta:', product.productFolder.meta);
      }
      
      console.log('\n=== ВСЕ ПОЛЯ ТОВАРА ===');
      console.log(Object.keys(product));
      
      console.log('\n=== ПОЛНАЯ СТРУКТУРА ===');
      console.log(JSON.stringify(product, null, 2));
      
    } else {
      console.log('Товары не найдены');
    }

    // Получаем папки товаров
    console.log('\n\n=== ПАПКИ ТОВАРОВ ===');
    const folderResponse = await client.get('/entity/productfolder?limit=5');
    
    if (folderResponse.data && folderResponse.data.rows && folderResponse.data.rows.length > 0) {
      console.log(`Найдено ${folderResponse.data.rows.length} папок товаров:`);
      
      folderResponse.data.rows.forEach((folder, index) => {
        console.log(`\nПапка ${index + 1}:`);
        console.log('  ID:', folder.id);
        console.log('  Название:', folder.name);
        console.log('  Путь:', folder.pathName);
        console.log('  Количество товаров:', folder.productCount);
      });
    } else {
      console.log('Папки товаров не найдены');
    }

  } catch (error) {
    console.error('Ошибка:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
  }
}

testProductStructure(); 