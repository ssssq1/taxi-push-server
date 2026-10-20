const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

console.log("🚀 Запуск сервера. Читаем ключ из файла...");

// Читаем файл, созданный в Render
const serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/service-account.json', 'utf8'));

// ГАРАНТИРОВАННО исправляем переносы строк, если Render их исказил
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Обработчик пинга (чтобы Render не засыпал)
app.get('/', (req, res) => {
  res.send('Taxi Push Server is running ✅');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.post('/send-push', async (req, res) => {
  try {
    const { tokens, title, body, orderId } = req.body;
    
    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'Нет токенов' });
    }

    let successCount = 0;

    // Отправляем по одному, это надежнее
    for (const token of tokens) {
      try {
        const message = {
          notification: { title, body },
          data: { type: 'new_order', orderId, title, body },
          android: { 
            priority: 'high', 
            notification: { 
              sound: 'default', 
              channel_id: 'taxi_orders_channel' 
            } 
          },
          token: token
        };

        await admin.messaging().send(message);
        console.log(`✅ Успешно: ${token.substring(0, 20)}...`);
        successCount++;
      } catch (error) {
        console.error(`❌ Ошибка токена: ${error.message}`);
      }
    }

    res.json({ success: true, count: successCount });
  } catch (error) {
    console.error(' Критическая ошибка сервера:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
