const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

console.log(" Загружен код с поштучной отправкой пушей!");

const serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/service-account.json', 'utf8'));

// Исправляем переносы строк в private_key
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.post('/send-push', async (req, res) => {
  try {
    const { tokens, title, body, orderId } = req.body;
    
    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'Нет токенов' });
    }

    let successCount = 0;
    let errorCount = 0;

    // Отправляем каждому токену отдельно
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

        const response = await admin.messaging().send(message);
        console.log(`✅ Пуш отправлен на токен: ${token.substring(0, 20)}...`);
        successCount++;
      } catch (error) {
        console.error(`❌ Ошибка для токена ${token.substring(0, 20)}...:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Итого: успешно ${successCount}, ошибок ${errorCount}`);
    res.json({ success: true, count: successCount, errors: errorCount });
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
