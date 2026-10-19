const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// ✅ ИСПРАВЛЕНИЕ: Читаем ключ из файла вместо переменной окружения
const serviceAccountPath = path.resolve('/etc/secrets/service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.post('/send-push', async (req, res) => {
  try {
    const { tokens, title, body, orderId } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'Нет токенов для отправки' });
    }

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
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`✅ Успешно: ${response.successCount}, Ошибок: ${response.failureCount}`);
    
    res.json({ success: true, count: response.successCount });
  } catch (error) {
    console.error('❌ Ошибка отправки:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
