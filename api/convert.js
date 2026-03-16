const convert = require('heic-convert');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const inputBuffer = Buffer.concat(chunks);

    const jpegBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.85,
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', jpegBuffer.length);
    res.status(200).send(Buffer.from(jpegBuffer));
  } catch (e) {
    res.status(500).json({ error: 'Conversion failed: ' + e.message });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
