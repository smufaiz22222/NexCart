import https from 'https';

const testUrls = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&q=80',
  'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&q=80',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
  'https://images.unsplash.com/photo-1526170315870-ef687299c1ad?w=600&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80',
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&q=80',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80',
  'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80',
  'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&q=80',
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&q=80',
];

for (const url of testUrls) {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url.slice(0, 50)}...`);
  });
}
