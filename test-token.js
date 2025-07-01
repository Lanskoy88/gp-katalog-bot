require('dotenv').config();
const axios = require('axios');

async function testToken() {
  const token = process.env.MOYSKLAD_API_TOKEN;
  
  console.log('🔍 ТЕСТ ТОКЕНА MOYSKLAD');
  console.log('=' .repeat(40));
  console.log(`Токен: ${token ? `${token.substring(0, 10)}...` : 'НЕ УСТАНОВЛЕН'}`);
  console.log(`Длина токена: ${token ? token.length : 0}`);
  console.log('');
  
  if (!token) {
    console.log('❌ Токен не установлен в переменных окружения');
    return;
  }
  
  const client = axios.create({
    baseURL: 'https://api.moysklad.ru/api/remap/1.2',
    headers: {
      'Accept': 'application/json;charset=utf-8',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    timeout: 10000
  });
  
  const endpoints = [
    { name: 'Товары', url: '/entity/product?limit=1' },
    { name: 'Категории', url: '/entity/productfolder?limit=1' },
    { name: 'Организация', url: '/entity/organization' },
    { name: 'Склад', url: '/entity/store' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Тестируем ${endpoint.name}...`);
      const response = await client.get(endpoint.url);
      console.log(`   ✅ ${endpoint.name}: ${response.status} - ${response.data.rows ? response.data.rows.length : 'OK'} записей`);
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ${error.response && error.response.status || 'ERROR'} - ${error.message}`);
      if (error.response && error.response.data) {
        console.log(`      Ответ: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
}

testToken().catch(console.error); 