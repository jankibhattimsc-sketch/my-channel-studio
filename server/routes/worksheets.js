const express = require('express');
const router = express.Router();
const worksheetMakerService = require('../services/worksheetMakerService');

router.post('/generate', async (req, res) => {
  try {
    const pack = await worksheetMakerService.generateWorksheetPack(req.body || {});
    res.json({ success: true, pack });
  } catch (err) {
    console.error('[WorksheetStudio Generate Error]:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/export-pdf', async (req, res) => {
  try {
    const { fullPrintableHtml, title } = req.body || {};
    if (!fullPrintableHtml || !String(fullPrintableHtml).includes('<html')) {
      return res.status(400).json({ success: false, error: 'Missing generated worksheet HTML.' });
    }
    const result = worksheetMakerService.exportWorkbookToPdf(fullPrintableHtml, title || 'kids_worksheet');
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[WorksheetStudio PDF Export Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publish-store', async (req, res) => {
  try {
    const {
      storeUrl = 'https://special-kids-worksheets.onrender.com',
      adminPin = '1234',
      title,
      subtitle,
      ageGroup,
      category,
      learningNeed,
      skillArea,
      pages,
      price = 0,
      mrp = 0,
      description,
      highlights,
      coverDataUrl,
      fullPrintableHtml
    } = req.body || {};

    if (!title || !fullPrintableHtml) {
      return res.status(400).json({ success: false, error: 'Generate a worksheet pack before publishing.' });
    }

    const exported = worksheetMakerService.exportWorkbookToPdf(fullPrintableHtml, title);
    const cleanStore = String(storeUrl).replace(/\/+$/, '');
    const r = await fetch(`${cleanStore}/api/admin/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': String(adminPin || '1234')
      },
      body: JSON.stringify({
        title,
        subtitle,
        learningGoal: subtitle,
        ageGroup: ageGroup || '4-6',
        category: category || 'Tracing',
        learningNeed: learningNeed || 'General Support',
        skillArea: skillArea || 'Fine Motor',
        pages: Number(pages) || 10,
        mrp: Number(mrp) || 0,
        price: Number(price) || 0,
        description,
        highlights: Array.isArray(highlights) ? highlights : [],
        coverBase64: coverDataUrl || '',
        pdfBase64: exported.pdfBase64,
        samplePdfBase64: exported.pdfBase64,
        published: true
      })
    });

    const data = await r.json();
    if (!r.ok || !data.success) {
      return res.status(r.status || 400).json({ success: false, error: data.error || 'Store upload failed.' });
    }

    res.json({
      success: true,
      book: data.book,
      downloadUrl: exported.downloadUrl,
      bytes: exported.bytes
    });
  } catch (err) {
    console.error('[WorksheetStudio Publish Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
