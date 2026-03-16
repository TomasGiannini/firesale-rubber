const convert = require('heic-convert');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  try {
    // Expect JSON body with { storageUrl } — the HEIC file URL in Supabase Storage
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    if (!body.storageUrl) {
      res.status(400).json({ error: 'Missing storageUrl in request body.' });
      return;
    }

    // Download the HEIC file from Supabase Storage (no body size limit issue)
    const fetchResp = await fetch(body.storageUrl);
    if (!fetchResp.ok) {
      res.status(502).json({ error: 'Could not download file from storage.' });
      return;
    }
    const arrayBuf = await fetchResp.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuf);

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
