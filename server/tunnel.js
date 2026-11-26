const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
  try {
    console.log('Connecting to localtunnel on port 5000...');
    const tunnel = await localtunnel({ port: 5000 });
    
    console.log('\n======================================================');
    console.log('🚀 LIVE WORLDWIDE PUBLIC TUNNEL IS ACTIVE!');
    console.log('🌐 PUBLIC URL FOR WHATSAPP / MOBILE: ' + tunnel.url);
    console.log('======================================================\n');

    const info = {
      url: tunnel.url,
      localUrl: 'http://192.168.1.2:5000',
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync('./public/tunnel-info.json', JSON.stringify(info, null, 2));

    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch (err) {
    console.error('Error starting tunnel:', err);
  }
})();
