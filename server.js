const express = require('express');
const app = express();
const handler = require('./functions/index').handler;

const port = process.env.PORT || 3000;

app.get('/api/index', async (req, res) => {
  try {
    const event = { queryStringParameters: req.query, headers: req.headers };
    const result = await handler(event, {});
    res.status(result.statusCode)
       .set(result.headers)
       .send(result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));