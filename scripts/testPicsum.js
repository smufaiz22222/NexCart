import https from 'https';

const testUrls = [
  'https://picsum.photos/seed/SKU-ELEC-00001/600/600',
  'https://picsum.photos/seed/SKU-ELEC-00002/600/600',
  'https://picsum.photos/seed/SKU-APPA-00003/600/600',
  'https://picsum.photos/seed/SKU-HOME-00004/600/600',
  'https://picsum.photos/seed/SKU-BEAU-00005/600/600',
  'https://picsum.photos/seed/SKU-SPOR-00006/600/600',
  'https://picsum.photos/seed/SKU-BOOK-00007/600/600',
  'https://picsum.photos/seed/SKU-TOYS-00008/600/600',
  'https://picsum.photos/seed/SKU-GROC-00009/600/600',
  'https://picsum.photos/seed/SKU-AUTO-00010/600/600',
  'https://picsum.photos/seed/SKU-PETS-00011/600/600',
];

console.log('Testing Picsum seed URLs...');
for (const url of testUrls) {
  https.get(url, (res) => {
    console.log(
      `Status ${res.statusCode} (Redirect to ${res.headers.location ? 'Image CDN' : 'Direct'}) - ${url}`
    );
  });
}
