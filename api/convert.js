const sharp = require('sharp');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  try {
    // Read raw body as buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Convert any image format to JPEG using sharp
    const jpeg = await sharp(buffer)
      .jpeg({ quality: 85 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', jpeg.length);
    res.status(200).send(jpeg);
  } catch (e) {
    res.status(500).json({ error: 'Conversion failed: ' + e.message });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
