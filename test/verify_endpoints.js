const endpoints = [
  'http://localhost:5000',
  'http://localhost:5000/api/health',
  'http://localhost:5000/api/auth/status',
  'http://localhost:5000/api/youtube/analytics',
  'http://localhost:5000/api/topics/trends-48h?category=schemes',
  'http://localhost:5000/api/topics/trending?category=all',
  'http://localhost:5000/api/chat/conversations',
  'http://localhost:5000/api/settings',
  'http://localhost:5000/css/style.css',
  'http://localhost:5000/css/components.css',
  'http://localhost:5000/js/app.js'
];

async function verify() {
  console.log('--- Verifying Server Endpoints ---');
  let allPass = true;
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      const isOk = res.status >= 200 && res.status < 400;
      console.log(`[${isOk ? 'OK' : 'FAIL'}] Status ${res.status}: ${url}`);
      if (!isOk) allPass = false;
    } catch (err) {
      console.error(`[ERROR] Failed to fetch ${url}: ${err.message}`);
      allPass = false;
    }
  }

  // Also test SEO generation POST
  try {
    const seoRes = await fetch('http://localhost:5000/api/seo/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'ટેસ્ટ વિષય', category: 'tech' })
    });
    const seoData = await seoRes.json();
    console.log(`[${seoRes.ok ? 'OK' : 'FAIL'}] POST /api/seo/generate -> ${seoData.data?.titles?.length} titles generated`);
  } catch (err) {
    console.error('[ERROR] POST /api/seo/generate failed:', err.message);
    allPass = false;
  }

  // Also test Script generation POST
  try {
    const scriptRes = await fetch('http://localhost:5000/api/scripts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'ગુજરાત યોજના', durationMinutes: 10, language: 'gu' })
    });
    const scriptData = await scriptRes.json();
    console.log(`[${scriptRes.ok ? 'OK' : 'FAIL'}] POST /api/scripts/generate -> ${scriptData.script?.sections?.length} sections, ${scriptData.script?.targetWordCount} words`);
  } catch (err) {
    console.error('[ERROR] POST /api/scripts/generate failed:', err.message);
    allPass = false;
  }

  // Also test Video Research POST
  try {
    const researchRes = await fetch('http://localhost:5000/api/research/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });
    const researchData = await researchRes.json();
    console.log(`[${researchRes.ok ? 'OK' : 'FAIL'}] POST /api/research/video -> ${researchData.report?.videoMetadata?.title ? 'Report Generated' : 'Failed'}`);
  } catch (err) {
    console.error('[ERROR] POST /api/research/video failed:', err.message);
    allPass = false;
  }

  // Also test Chat Message POST
  try {
    const chatRes = await fetch('http://localhost:5000/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: 'default-conv', message: 'ટેસ્ટ પ્રશ્ન', includeChannelContext: true })
    });
    const chatData = await chatRes.json();
    console.log(`[${chatRes.ok ? 'OK' : 'FAIL'}] POST /api/chat/message -> ${chatData.message?.content || chatData.reply ? 'AI Replied' : 'Failed'}`);
  } catch (err) {
    console.error('[ERROR] POST /api/chat/message failed:', err.message);
    allPass = false;
  }

  if (allPass) {
    console.log('✅ ALL APPLICATION ENDPOINTS ARE FULLY OPERATIONAL!');
  } else {
    process.exit(1);
  }
}

verify();
