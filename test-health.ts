import http from 'http';

setInterval(() => {
  http.get('http://localhost:3000/api/health', (res) => {
    console.log('Health:', res.statusCode);
  }).on('error', (e) => {
    console.error('Health Error:', e.message);
  });
}, 1000);
