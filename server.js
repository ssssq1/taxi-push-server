const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

console.log(" ЗАГРУЖЕН КОД С ИСПРАВЛЕНИЕМ ПЕРЕНОСОВ СТРОК! 🚀");

const serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/service-account.json', 'utf8'));

// ИСПРАВЛЯЕМ \n НА РЕАЛЬНЫЕ ПЕРЕНОСЫ СТРОК
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

    const message = {
      notification: { title, body },
      data: { type: 'new_order', orderId, title, body },
      android: { priority: 'high', notification: { sound: 'default', channel_id: 'taxi_orders_channel' } },
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`✅ Успешно: ${response.successCount}`);
    res.json({ success: true, count: response.successCount });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
