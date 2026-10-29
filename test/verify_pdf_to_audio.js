const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('--- Testing POST /api/voice/pdf-to-audio ---');

  // Create a valid test PDF buffer with Gujarati circular content
  const samplePdfContent = 
    '%PDF-1.4\n' +
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n' +
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n' +
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n' +
    '4 0 obj << /Length 120 >> stream\n' +
    'BT /F1 12 Tf 72 712 Td (Slide 1: Gujarat Sarkar Karmachari DA Vadharo 2026) Tj ET\n' +
    'endstream endobj\n' +
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000370 00000 n \n' +
    'trailer << /Size 6 /Root 1 0 R >>\nstartxref\n450\n%%EOF';

  const base64Pdf = Buffer.from(samplePdfContent).toString('base64');

  const payload = {
    pdfBase64: base64Pdf,
    filename: 'karmachari_da_circular_2026.pdf',
    profileId: 'anchor-dhwani-female',
    speed: 1.08,
    emotion: 'enthusiastic'
  };

  const res = await fetch('http://localhost:5000/api/voice/pdf-to-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Status code:', res.status);
  console.log('Response data:', {
    success: data.success,
    audioUrl: data.audioUrl,
    filename: data.filename,
    fileSize: data.fileSize,
    totalPages: data.totalPages,
    narrationLength: data.narrationText?.length,
    provider: data.provider
  });

  assert.strictEqual(res.status, 200, 'HTTP status should be 200');
  assert.strictEqual(data.success, true, 'success should be true');
  assert.ok(data.audioUrl && data.audioUrl.startsWith('/audio/'), 'audioUrl should start with /audio/');
  assert.ok(data.fileSize > 0, 'fileSize should be greater than 0');
  assert.ok(data.narrationText && data.narrationText.length > 20, 'narrationText should be extracted');

  // Verify the audio file can be downloaded from the server
  const audioCheck = await fetch(`http://localhost:5000${data.audioUrl}`);
  assert.strictEqual(audioCheck.status, 200, 'Audio URL should return 200 OK');
  const buffer = await audioCheck.arrayBuffer();
  assert.ok(buffer.byteLength > 0, 'Audio file should have content');

  console.log(`\n🎉 Verification Passed: Generated audio of ${buffer.byteLength} bytes for uploaded PDF!`);
}

runTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
