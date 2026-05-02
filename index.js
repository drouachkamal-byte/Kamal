require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: 'BotFlow' });
});

app.get('/', (req, res) => {
  res.json({ message: 'BotFlow API is running!' });
});

app.listen(PORT, () => {
  console.log(`BotFlow running on port ${PORT}`);
});
