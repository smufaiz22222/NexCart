import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';

async function main() {
  console.log('🌱 Starting database seed with hardcoded data...');

  const hashedPassword = await bcrypt.hash('1234', 10);

  console.log('Sweeping old data...');
  await prisma.inventoryLog.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.wholesaler.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating 3 Users...');
  
  await prisma.user.create({
    data: { name: 'Alice Buyer', email: 'buyer@example.com', password: hashedPassword, role: 'CUSTOMER' },
  });

  const techUser = await prisma.user.create({
    data: {
      name: 'Bob Tech', email: 'tech@example.com', password: hashedPassword, role: 'WHOLESALER',
      wholesalerProfile: { create: { businessName: 'ElectroHub Pro' } },
    },
    include: { wholesalerProfile: true }
  });
  const w1 = techUser.wholesalerProfile.id;

  const threadsUser = await prisma.user.create({
    data: {
      name: 'Charlie Style', email: 'threads@example.com', password: hashedPassword, role: 'WHOLESALER',
      wholesalerProfile: { create: { businessName: 'Urban Threads' } },
    },
    include: { wholesalerProfile: true }
  });
  const w2 = threadsUser.wholesalerProfile.id;

  console.log('Inserting 100 Hardcoded Products...');
  
  const allProducts = [
    { wholesalerId: w1, name: "Pro Smartphone 128GB", description: "Latest gen smartphone", price: 899, costPrice: 600, sku: "ELEC-001", currentStock: 45, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Pro Smartphone 256GB", description: "More storage", price: 999, costPrice: 650, sku: "ELEC-002", currentStock: 30, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Gaming Laptop 15-inch", description: "High performance", price: 1299, costPrice: 900, sku: "ELEC-003", currentStock: 20, minStock: 5, imageUrl: "https:
    { wholesalerId: w1, name: "Office Laptop 14-inch", description: "Light and fast", price: 799, costPrice: 500, sku: "ELEC-004", currentStock: 50, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Wireless Earbuds", description: "Noise cancelling", price: 149, costPrice: 80, sku: "ELEC-005", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w1, name: "Over-Ear Headphones", description: "Studio quality", price: 299, costPrice: 150, sku: "ELEC-006", currentStock: 60, minStock: 15, imageUrl: "https:
    { wholesalerId: w1, name: "Smartwatch Series 5", description: "Health tracking", price: 249, costPrice: 130, sku: "ELEC-007", currentStock: 40, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Fitness Tracker", description: "Step counter", price: 99, costPrice: 40, sku: "ELEC-008", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w1, name: "4K LED TV 55-inch", description: "Smart TV", price: 599, costPrice: 350, sku: "ELEC-009", currentStock: 15, minStock: 5, imageUrl: "https:
    { wholesalerId: w1, name: "OLED TV 65-inch", description: "Premium display", price: 1499, costPrice: 900, sku: "ELEC-010", currentStock: 10, minStock: 2, imageUrl: "https:
    { wholesalerId: w1, name: "Bluetooth Speaker", description: "Waterproof portable", price: 59, costPrice: 25, sku: "ELEC-011", currentStock: 80, minStock: 15, imageUrl: "https:
    { wholesalerId: w1, name: "Home Theater System", description: "5.1 Surround", price: 399, costPrice: 200, sku: "ELEC-012", currentStock: 25, minStock: 5, imageUrl: "https:
    { wholesalerId: w1, name: "Mechanical Keyboard", description: "RGB Switches", price: 109, costPrice: 50, sku: "ELEC-013", currentStock: 60, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Wireless Mouse", description: "Ergonomic", price: 49, costPrice: 20, sku: "ELEC-014", currentStock: 120, minStock: 20, imageUrl: "https:
    { wholesalerId: w1, name: "Gaming Mouse", description: "High DPI", price: 69, costPrice: 30, sku: "ELEC-015", currentStock: 90, minStock: 15, imageUrl: "https:
    { wholesalerId: w1, name: "USB-C Hub", description: "7-in-1 dongle", price: 39, costPrice: 15, sku: "ELEC-016", currentStock: 200, minStock: 40, imageUrl: "https:
    { wholesalerId: w1, name: "External SSD 1TB", description: "Fast storage", price: 129, costPrice: 70, sku: "ELEC-017", currentStock: 75, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "External HDD 2TB", description: "Backup storage", price: 79, costPrice: 40, sku: "ELEC-018", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w1, name: "Webcam 1080p", description: "Clear video calls", price: 59, costPrice: 25, sku: "ELEC-019", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w1, name: "Webcam 4K", description: "Pro streaming", price: 149, costPrice: 80, sku: "ELEC-020", currentStock: 40, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Wi-Fi 6 Router", description: "Fast internet", price: 199, costPrice: 100, sku: "ELEC-021", currentStock: 50, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Mesh Wi-Fi System", description: "Whole home coverage", price: 299, costPrice: 150, sku: "ELEC-022", currentStock: 30, minStock: 5, imageUrl: "https:
    { wholesalerId: w1, name: "Smart Plug", description: "Voice controlled", price: 19, costPrice: 8, sku: "ELEC-023", currentStock: 300, minStock: 50, imageUrl: "https:
    { wholesalerId: w1, name: "Smart Bulb", description: "RGB LED", price: 24, costPrice: 10, sku: "ELEC-024", currentStock: 250, minStock: 50, imageUrl: "https:
    { wholesalerId: w1, name: "Action Camera", description: "4K 60fps", price: 349, costPrice: 200, sku: "ELEC-025", currentStock: 35, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Drone with Camera", description: "Foldable design", price: 499, costPrice: 300, sku: "ELEC-026", currentStock: 20, minStock: 5, imageUrl: "https:
    { wholesalerId: w1, name: "Tablet 10-inch", description: "For reading and video", price: 299, costPrice: 150, sku: "ELEC-027", currentStock: 80, minStock: 15, imageUrl: "https:
    { wholesalerId: w1, name: "E-Reader", description: "Paper-like display", price: 129, costPrice: 70, sku: "ELEC-028", currentStock: 60, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Portable Power Bank", description: "10000mAh", price: 29, costPrice: 12, sku: "ELEC-029", currentStock: 200, minStock: 40, imageUrl: "https:
    { wholesalerId: w1, name: "High-Cap Power Bank", description: "20000mAh", price: 49, costPrice: 22, sku: "ELEC-030", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w1, name: "Fast Wall Charger", description: "65W GaN", price: 35, costPrice: 15, sku: "ELEC-031", currentStock: 180, minStock: 40, imageUrl: "https:
    { wholesalerId: w1, name: "Wireless Charging Pad", description: "Qi Certified", price: 25, costPrice: 10, sku: "ELEC-032", currentStock: 120, minStock: 20, imageUrl: "https:
    { wholesalerId: w1, name: "USB-C Cable 6ft", description: "Braided cord", price: 15, costPrice: 5, sku: "ELEC-033", currentStock: 500, minStock: 100, imageUrl: "https:
    { wholesalerId: w1, name: "Lightning Cable 6ft", description: "MFi Certified", price: 18, costPrice: 6, sku: "ELEC-034", currentStock: 450, minStock: 100, imageUrl: "https:
    { wholesalerId: w1, name: "Monitor 24-inch", description: "1080p IPS", price: 149, costPrice: 80, sku: "ELEC-035", currentStock: 70, minStock: 15, imageUrl: "https:
    { wholesalerId: w1, name: "Monitor 27-inch", description: "1440p 144Hz", price: 299, costPrice: 180, sku: "ELEC-036", currentStock: 40, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Microphone", description: "USB Condenser", price: 99, costPrice: 40, sku: "ELEC-037", currentStock: 60, minStock: 15, imageUrl: "https:
    { wholesalerId: w1, name: "Ring Light", description: "10-inch LED", price: 39, costPrice: 15, sku: "ELEC-038", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w1, name: "Tripod Stand", description: "Adjustable height", price: 29, costPrice: 12, sku: "ELEC-039", currentStock: 120, minStock: 25, imageUrl: "https:
    { wholesalerId: w1, name: "Graphics Card RTX", description: "8GB VRAM", price: 499, costPrice: 350, sku: "ELEC-040", currentStock: 15, minStock: 5, imageUrl: "https:
    { wholesalerId: w1, name: "CPU 8-Core", description: "High frequency", price: 299, costPrice: 200, sku: "ELEC-041", currentStock: 30, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Motherboard ATX", description: "WiFi included", price: 199, costPrice: 120, sku: "ELEC-042", currentStock: 40, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "RAM 16GB Kit", description: "3200MHz DDR4", price: 79, costPrice: 40, sku: "ELEC-043", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w1, name: "PC Case", description: "Tempered Glass", price: 89, costPrice: 45, sku: "ELEC-044", currentStock: 25, minStock: 5, imageUrl: "https:
    { wholesalerId: w1, name: "Power Supply 750W", description: "80+ Gold", price: 109, costPrice: 60, sku: "ELEC-045", currentStock: 40, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Smart Lock", description: "Keypad entry", price: 149, costPrice: 80, sku: "ELEC-046", currentStock: 50, minStock: 10, imageUrl: "https:
    { wholesalerId: w1, name: "Video Doorbell", description: "1080p camera", price: 99, costPrice: 50, sku: "ELEC-047", currentStock: 70, minStock: 15, imageUrl: "https:
    { wholesalerId: w1, name: "Security Camera", description: "Indoor/Outdoor", price: 79, costPrice: 40, sku: "ELEC-048", currentStock: 90, minStock: 20, imageUrl: "https:
    { wholesalerId: w1, name: "Smart Thermostat", description: "Energy saving", price: 199, costPrice: 100, sku: "ELEC-049", currentStock: 30, minStock: 10, imageUrl: "https:
    { wholesalerId: w2, name: "Robot Vacuum", description: "Auto mapping", price: 249, costPrice: 130, sku: "ELEC-050", currentStock: 25, minStock: 5, imageUrl: "https:

    { wholesalerId: w2, name: "Classic T-Shirt Black", description: "100% Cotton", price: 20, costPrice: 8, sku: "APP-051", currentStock: 200, minStock: 50, imageUrl: "https:
    { wholesalerId: w2, name: "Classic T-Shirt White", description: "100% Cotton", price: 20, costPrice: 8, sku: "APP-052", currentStock: 200, minStock: 50, imageUrl: "https:
    { wholesalerId: w2, name: "V-Neck T-Shirt Blue", description: "Slim fit", price: 25, costPrice: 10, sku: "APP-053", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w2, name: "Graphic Tee Vintage", description: "Retro print", price: 30, costPrice: 12, sku: "APP-054", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Long Sleeve Henley", description: "Ribbed cotton", price: 35, costPrice: 15, sku: "APP-055", currentStock: 80, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Polo Shirt Navy", description: "Breathable mesh", price: 40, costPrice: 18, sku: "APP-056", currentStock: 120, minStock: 25, imageUrl: "https:
    { wholesalerId: w2, name: "Polo Shirt Red", description: "Breathable mesh", price: 40, costPrice: 18, sku: "APP-057", currentStock: 100, minStock: 25, imageUrl: "https:
    { wholesalerId: w2, name: "Denim Jacket Light", description: "Vintage wash", price: 89, costPrice: 40, sku: "APP-058", currentStock: 40, minStock: 10, imageUrl: "https:
    { wholesalerId: w2, name: "Denim Jacket Dark", description: "Raw indigo", price: 89, costPrice: 40, sku: "APP-059", currentStock: 40, minStock: 10, imageUrl: "https:
    { wholesalerId: w2, name: "Leather Jacket Black", description: "Genuine leather", price: 199, costPrice: 90, sku: "APP-060", currentStock: 20, minStock: 5, imageUrl: "https:
    { wholesalerId: w2, name: "Bomber Jacket Olive", description: "Lightweight zip", price: 79, costPrice: 35, sku: "APP-061", currentStock: 60, minStock: 15, imageUrl: "https:
    { wholesalerId: w2, name: "Windbreaker Neon", description: "Water resistant", price: 69, costPrice: 30, sku: "APP-062", currentStock: 50, minStock: 10, imageUrl: "https:
    { wholesalerId: w2, name: "Fleece Hoodie Grey", description: "Warm and soft", price: 59, costPrice: 25, sku: "APP-063", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w2, name: "Pullover Hoodie Black", description: "Classic fit", price: 55, costPrice: 22, sku: "APP-064", currentStock: 180, minStock: 40, imageUrl: "https:
    { wholesalerId: w2, name: "Crewneck Sweatshirt", description: "Vintage athletic", price: 49, costPrice: 20, sku: "APP-065", currentStock: 120, minStock: 25, imageUrl: "https:
    { wholesalerId: w2, name: "Slim Fit Jeans Blue", description: "Stretch denim", price: 69, costPrice: 30, sku: "APP-066", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Straight Jeans Black", description: "Classic cut", price: 69, costPrice: 30, sku: "APP-067", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Chino Pants Khaki", description: "Office ready", price: 59, costPrice: 25, sku: "APP-068", currentStock: 120, minStock: 25, imageUrl: "https:
    { wholesalerId: w2, name: "Chino Pants Navy", description: "Office ready", price: 59, costPrice: 25, sku: "APP-069", currentStock: 120, minStock: 25, imageUrl: "https:
    { wholesalerId: w2, name: "Cargo Pants Olive", description: "Multiple pockets", price: 65, costPrice: 28, sku: "APP-070", currentStock: 80, minStock: 15, imageUrl: "https:
    { wholesalerId: w2, name: "Joggers Grey", description: "Athleisure wear", price: 45, costPrice: 18, sku: "APP-071", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w2, name: "Athletic Shorts Black", description: "Quick dry", price: 35, costPrice: 14, sku: "APP-072", currentStock: 200, minStock: 40, imageUrl: "https:
    { wholesalerId: w2, name: "Board Shorts Floral", description: "Swimwear", price: 40, costPrice: 16, sku: "APP-073", currentStock: 90, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Casual Button-Down", description: "Plaid flannel", price: 55, costPrice: 24, sku: "APP-074", currentStock: 110, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Dress Shirt White", description: "Wrinkle free", price: 65, costPrice: 28, sku: "APP-075", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Dress Shirt Blue", description: "Wrinkle free", price: 65, costPrice: 28, sku: "APP-076", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Blazer Navy", description: "Tailored fit", price: 149, costPrice: 65, sku: "APP-077", currentStock: 40, minStock: 10, imageUrl: "https:
    { wholesalerId: w2, name: "Summer Dress Floral", description: "Lightweight rayon", price: 59, costPrice: 25, sku: "APP-078", currentStock: 80, minStock: 15, imageUrl: "https:
    { wholesalerId: w2, name: "Maxi Dress Black", description: "Elegant evening", price: 89, costPrice: 40, sku: "APP-079", currentStock: 60, minStock: 10, imageUrl: "https:
    { wholesalerId: w2, name: "Pleated Skirt", description: "Midi length", price: 49, costPrice: 20, sku: "APP-080", currentStock: 70, minStock: 15, imageUrl: "https:
    { wholesalerId: w2, name: "Women's Blouse Silk", description: "Office elegant", price: 79, costPrice: 35, sku: "APP-081", currentStock: 90, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Cardigan Sweater", description: "Button up knit", price: 55, costPrice: 22, sku: "APP-082", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Turtleneck Sweater", description: "Wool blend", price: 65, costPrice: 28, sku: "APP-083", currentStock: 80, minStock: 15, imageUrl: "https:
    { wholesalerId: w2, name: "Beanie Hat", description: "Ribbed knit", price: 19, costPrice: 6, sku: "APP-084", currentStock: 300, minStock: 50, imageUrl: "https:
    { wholesalerId: w2, name: "Baseball Cap", description: "Adjustable back", price: 25, costPrice: 8, sku: "APP-085", currentStock: 250, minStock: 40, imageUrl: "https:
    { wholesalerId: w2, name: "Leather Belt Black", description: "Classic buckle", price: 35, costPrice: 12, sku: "APP-086", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w2, name: "Leather Belt Brown", description: "Classic buckle", price: 35, costPrice: 12, sku: "APP-087", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w2, name: "Sneakers White", description: "Casual everyday", price: 79, costPrice: 35, sku: "APP-088", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Running Shoes Black", description: "Performance mesh", price: 120, costPrice: 50, sku: "APP-089", currentStock: 80, minStock: 15, imageUrl: "https:
    { wholesalerId: w2, name: "Leather Boots", description: "Waterproof", price: 150, costPrice: 70, sku: "APP-090", currentStock: 50, minStock: 10, imageUrl: "https:
    { wholesalerId: w2, name: "Dress Shoes Oxford", description: "Formal leather", price: 130, costPrice: 60, sku: "APP-091", currentStock: 60, minStock: 10, imageUrl: "https:
    { wholesalerId: w2, name: "Socks 5-Pack White", description: "Cotton crew", price: 15, costPrice: 5, sku: "APP-092", currentStock: 400, minStock: 80, imageUrl: "https:
    { wholesalerId: w2, name: "Socks 5-Pack Black", description: "Cotton crew", price: 15, costPrice: 5, sku: "APP-093", currentStock: 400, minStock: 80, imageUrl: "https:
    { wholesalerId: w2, name: "Underwear 3-Pack", description: "Boxer briefs", price: 25, costPrice: 10, sku: "APP-094", currentStock: 300, minStock: 60, imageUrl: "https:
    { wholesalerId: w2, name: "Scarf Plaid", description: "Winter warm", price: 29, costPrice: 10, sku: "APP-095", currentStock: 100, minStock: 20, imageUrl: "https:
    { wholesalerId: w2, name: "Gloves Leather", description: "Touchscreen compatible", price: 45, costPrice: 18, sku: "APP-096", currentStock: 80, minStock: 15, imageUrl: "https:
    { wholesalerId: w2, name: "Sunglasses Aviator", description: "Polarized lenses", price: 89, costPrice: 30, sku: "APP-097", currentStock: 120, minStock: 25, imageUrl: "https:
    { wholesalerId: w2, name: "Sunglasses Wayfarer", description: "Classic frame", price: 79, costPrice: 25, sku: "APP-098", currentStock: 150, minStock: 30, imageUrl: "https:
    { wholesalerId: w2, name: "Backpack Canvas", description: "Laptop sleeve inside", price: 59, costPrice: 20, sku: "APP-099", currentStock: 90, minStock: 15, imageUrl: "https:
    { wholesalerId: w2, name: "Duffel Bag", description: "Gym and travel", price: 69, costPrice: 25, sku: "APP-100", currentStock: 70, minStock: 10, imageUrl: "https:
  ];

  await prisma.product.createMany({ data: allProducts });

  console.log('✅ Seeding completely finished! You are ready to go.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
