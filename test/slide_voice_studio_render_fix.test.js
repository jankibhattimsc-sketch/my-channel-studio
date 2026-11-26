const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Slide Voice Studio Component Rendering Verification', async (t) => {
  const content = fs.readFileSync('public/js/components/slideVoiceStudio.js', 'utf8');

  await t.test('1. No undeclared projSlides reference in renderStudio', () => {
    const renderStudioStart = content.indexOf('function renderStudio()');
    assert.ok(renderStudioStart > -1, 'renderStudio function must exist');
    const renderStudioBody = content.slice(renderStudioStart, renderStudioStart + 2500);
    assert.strictEqual(
      renderStudioBody.includes('projSlides.length'),
      false,
      'renderStudio must not reference undeclared projSlides'
    );
  });

  await t.test('2. mountSlideVoiceStudio immediately calls renderStudio and catches errors', () => {
    assert.ok(
      content.includes('renderStudio();\n  reloadSlides().then'),
      'mountSlideVoiceStudio must call renderStudio() immediately to prevent blank screen'
    );
    assert.ok(
      content.includes('catch((err) => {'),
      'mountSlideVoiceStudio must have error handling on reloadSlides'
    );
  });

  await t.test('3. renderStudio includes try/catch error boundary fallback', () => {
    assert.ok(
      content.includes('catch (renderErr)'),
      'renderStudio must include catch block so screen is never blank white'
    );
    assert.ok(
      content.includes('svr-retry-render-btn'),
      'renderStudio error boundary must provide a retry button'
    );
  });

  await t.test('4. myvoice.js imports slideVoiceStudio with updated cache buster', () => {
    const myvoice = fs.readFileSync('public/js/views/myvoice.js', 'utf8');
    assert.ok(
      /import\s+\{\s*mountSlideVoiceStudio\s*\}\s+from\s+['"]\.\.\/components\/slideVoiceStudio\.js\?v=[0-9.]+['"];?/.test(myvoice),
      'myvoice.js must import slideVoiceStudio with updated cache buster'
    );
  });

  await t.test('5. largeModal and largeAudio are declared before any event listeners reference them', () => {
    const modalDeclIdx = content.indexOf('const largeModal =');
    const modalUseIdx = content.indexOf('largeModal?.querySelector');
    assert.ok(modalDeclIdx > -1, 'const largeModal must be declared');
    assert.ok(modalDeclIdx < modalUseIdx, 'largeModal must be declared before any querySelector use');

    const audioDeclIdx = content.indexOf('const largeAudio =');
    const audioUseIdx = content.indexOf('largeAudio?.paused');
    assert.ok(audioDeclIdx > -1, 'const largeAudio must be declared');
    assert.ok(audioDeclIdx < audioUseIdx, 'largeAudio must be declared before any use');
  });

  await t.test('6. renderSinglePdfPage on-demand function is defined', () => {
    assert.ok(
      content.includes('async function renderSinglePdfPage('),
      'renderSinglePdfPage must be defined for instant 16:9 PDF rendering'
    );
  });
});
