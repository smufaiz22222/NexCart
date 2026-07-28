import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { prisma } from '../src/config/db.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Comprehensive Subcategory Image Map (Direct high-res Unsplash photos)
const SUBCATEGORY_IMAGES = {
  // Electronics
  'Mobile Phones': [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
    'https://images.unsplash.com/photo-1592890288564-76628a30a657',
    'https://images.unsplash.com/photo-1565849904461-04a58ad377e0',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505',
    'https://images.unsplash.com/photo-1546054454-aa26e2b734c7',
  ],
  'Laptops & Computers': [
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1',
  ],
  Tablets: [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9',
  ],
  'Headphones & Earbuds': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90',
  ],
  'Cameras & Photography': [
    'https://images.unsplash.com/photo-1526170315870-ef687299c1ad',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd',
  ],
  'Smart Watches': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1',
  ],
  Televisions: [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1',
    'https://images.unsplash.com/photo-1593784991095-a205029471b6',
    'https://images.unsplash.com/photo-1571415060716-baff5f7d9c65',
  ],
  'Speakers & Audio': [
    'https://images.unsplash.com/photo-1608156639585-b3a032ef9689',
    'https://images.unsplash.com/photo-1545454675-3531bdf9915e',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad',
  ],
  'Gaming Accessories': [
    'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7',
  ],
  'Cables & Adapters': [
    'https://images.unsplash.com/photo-1618410320928-25228d811631',
    'https://images.unsplash.com/photo-1619145122116-29a0083e4708',
    'https://images.unsplash.com/photo-1619145121172-e42967679803',
  ],

  // Apparel
  "Men's Clothing": [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
    'https://images.unsplash.com/photo-1617137968427-85924c800a22',
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
  ],
  "Women's Clothing": [
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105',
    'https://images.unsplash.com/photo-1581044777550-4cfa60707c03',
  ],
  "Kids' Clothing": [
    'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea',
    'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8',
    'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2',
  ],
  Footwear: [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a',
  ],
  Watches: [
    'https://images.unsplash.com/photo-1524805444758-089113d48a6d',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
    'https://images.unsplash.com/photo-1539185441755-769473a23570',
  ],
  Sunglasses: [
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f',
    'https://images.unsplash.com/photo-1577803645773-f96470509666',
  ],
  'Handbags & Wallets': [
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7',
    'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d',
  ],
  Jewellery: [
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
  ],
  'Ethnic Wear': [
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb',
  ],
  'Winter Wear': [
    'https://images.unsplash.com/photo-1548883354-7622d03aca27',
    'https://images.unsplash.com/photo-1578587018452-892bacefd3f2',
    'https://images.unsplash.com/photo-1516762689617-e1cffcef479d',
  ],

  // Home & Kitchen
  'Kitchen Appliances': [
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f',
    'https://images.unsplash.com/photo-1588854337236-6889d631faa8',
    'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078',
  ],
  'Cookware & Dining': [
    'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce',
    'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7',
    'https://images.unsplash.com/photo-1544816155-12df9643f363',
  ],
  'Home Decor': [
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7',
    'https://images.unsplash.com/photo-1538688525198-9b88f6f53126',
  ],
  'Bedding & Mattresses': [
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af',
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0',
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2',
  ],
  Lighting: [
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15',
    'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f',
  ],
  'Storage & Organization': [
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  ],
  'Cleaning Supplies': [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a',
    'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2',
  ],
  Furniture: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7',
    'https://images.unsplash.com/photo-1538688525198-9b88f6f53126',
  ],
  'Garden & Outdoor': [
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b',
  ],
  'Smart Home': [
    'https://images.unsplash.com/photo-1558002038-1055907df827',
    'https://images.unsplash.com/photo-1550524514-9636edba3118',
  ],

  // Beauty
  Skincare: [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881',
    'https://images.unsplash.com/photo-1608248597481-496100c80836',
  ],
  Haircare: [
    'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388',
    'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d',
  ],
  Makeup: [
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
  ],
  Fragrances: [
    'https://images.unsplash.com/photo-1541643600914-78b084683601',
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539',
    'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75',
  ],
  'Bath & Body': [
    'https://images.unsplash.com/photo-1607006482186-b489d8544cb4',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
  ],
  "Men's Grooming": [
    'https://images.unsplash.com/photo-1621607512214-68297480165e',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1',
  ],
  'Oral Care': [
    'https://images.unsplash.com/photo-1559599101-f09722fb4948',
    'https://images.unsplash.com/photo-1559656914-a30970c1affd',
  ],
  'Health & Wellness': [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
  ],
  Appliances: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
  ],
  'Luxury Beauty': [
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908',
    'https://images.unsplash.com/photo-1515688594390-b649af70d282',
  ],

  // Sports
  Cricket: [
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da',
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
  ],
  'Fitness & Gym': [
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd',
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f',
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2',
  ],
  Football: [
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
  ],
  Badminton: [
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea',
    'https://images.unsplash.com/photo-1521537634581-0dced2efa2a3',
  ],
  Cycling: [
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e',
    'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7',
  ],
  'Running Shoes': [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a',
    'https://images.unsplash.com/photo-1584735175315-9d5df23860e6',
  ],
  'Camping & Hiking': [
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4',
    'https://images.unsplash.com/photo-1510312305653-8ed496efae75',
  ],
  'Yoga & Meditation': [
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597',
  ],
  Swimming: [
    'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e',
    'https://images.unsplash.com/photo-1519315901367-f34ff9154487',
  ],
  'Sports Nutrition': [
    'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f',
    'https://images.unsplash.com/photo-1593095940071-022636577459',
  ],

  // Books
  Fiction: [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794',
  ],
  'Non-Fiction': [
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765',
  ],
  'Academic & Textbooks': [
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f',
  ],
  "Children's Books": [
    'https://images.unsplash.com/photo-1512820790803-83ca734da794',
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353',
  ],
  'Comics & Manga': [
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f',
    'https://images.unsplash.com/photo-1588497859490-85d1c17db96d',
  ],
  'Self Help': [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
    'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6',
  ],
  'Notebooks & Diaries': [
    'https://images.unsplash.com/photo-1517842645767-c639042777db',
    'https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f',
  ],
  'Pens & Writing': [
    'https://images.unsplash.com/photo-1585336261026-870a9423e9f8',
    'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd',
  ],
  'Art Supplies': [
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675',
  ],

  // Toys & Games
  'Action Figures': [
    'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806',
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088',
  ],
  'Board Games': [
    'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09',
    'https://images.unsplash.com/photo-1632501641765-e568d28b0015',
  ],
  'Building Blocks': [
    'https://images.unsplash.com/photo-1587654780291-39c9404d746b',
    'https://images.unsplash.com/photo-1558060370-d644479cb6f7',
  ],
  'Dolls & Playsets': [
    'https://images.unsplash.com/photo-1539627831859-a911cf04d3cd',
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1',
  ],
  'Educational Toys': [
    'https://images.unsplash.com/photo-1515488042361-404e9250afef',
    'https://images.unsplash.com/photo-1587654780291-39c9404d746b',
  ],
  'Remote Control Toys': [
    'https://images.unsplash.com/photo-1527977966376-1c8408f9f108',
    'https://images.unsplash.com/photo-1594787318286-3d835c1d207f',
  ],
  Puzzles: [
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8',
    'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d',
  ],
  'Outdoor Play': [
    'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b',
  ],
  'Card Games': [
    'https://images.unsplash.com/photo-1541278107931-e006523892df',
    'https://images.unsplash.com/photo-1606167668584-78701c57f13d',
  ],
  'Plush Toys': [
    'https://images.unsplash.com/photo-1563245372-f21724e3856d',
    'https://images.unsplash.com/photo-1559454403-b8fb88521f11',
  ],

  // Grocery
  'Snacks & Beverages': [
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b',
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60',
  ],
  'Staples & Cooking': [
    'https://images.unsplash.com/photo-1586201375761-83865001e31c',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58',
  ],
  'Dairy & Eggs': [
    'https://images.unsplash.com/photo-1550583724-b2692b85b150',
    'https://images.unsplash.com/photo-1516467508483-a7212febe31a',
  ],
  'Fruits & Vegetables': [
    'https://images.unsplash.com/photo-1610397613050-5999d1487f47',
    'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9',
  ],
  'Packaged Foods': [
    'https://images.unsplash.com/photo-1542838132-92c53300491e',
    'https://images.unsplash.com/photo-1488459718432-36a85e089406',
  ],
  'Organic & Natural': [
    'https://images.unsplash.com/photo-1543083501-594121ca1db5',
    'https://images.unsplash.com/photo-1506084868230-bb9d95c24759',
  ],
  'Tea & Coffee': [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3',
  ],
  'Spices & Masalas': [
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d',
    'https://images.unsplash.com/photo-1509358217973-895746a4966b',
  ],
  'Chocolates & Sweets': [
    'https://images.unsplash.com/photo-1511381939415-e44015466834',
    'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
  ],
  'International Foods': [
    'https://images.unsplash.com/photo-1555126634-323283e090fa',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d',
  ],

  // Automotive
  'Car Accessories': [
    'https://images.unsplash.com/photo-1486006920555-c77dce18193b',
    'https://images.unsplash.com/photo-1507136566006-cfc505b114fc',
  ],
  'Bike Accessories': [
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc',
    'https://images.unsplash.com/photo-1502744688674-c619d1586c9e',
  ],
  'Car Electronics': [
    'https://images.unsplash.com/photo-1617469767053-d3b523a0b982',
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8',
  ],
  'Tyres & Rims': [
    'https://images.unsplash.com/photo-1578844251758-2f71da64c96f',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537',
  ],
  'Oils & Lubricants': [
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e',
    'https://images.unsplash.com/photo-1599577180579-79a61f36b69b',
  ],
  'Helmets & Gear': [
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39',
    'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87',
  ],
  'Car Care': [
    'https://images.unsplash.com/photo-1607860108855-64acf2078ed9',
    'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
  ],
  'Tools & Equipment': [
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
    'https://images.unsplash.com/photo-1530124566582-a618bc2615dc',
  ],
  'Interior Accessories': [
    'https://images.unsplash.com/photo-1617469767053-d3b523a0b982',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
  ],
  'GPS & Navigation': [
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1',
    'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
  ],

  // Office Supplies
  'Notebooks & Paper': [
    'https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f',
    'https://images.unsplash.com/photo-1531346878377-a5be20888e57',
    'https://images.unsplash.com/photo-1517842645767-c639042777db',
  ],
  'Pens & Writing': [
    'https://images.unsplash.com/photo-1585336261026-870a9423e9f8',
    'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38',
  ],
  'Desk Organizers': [
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3',
    'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc',
    'https://images.unsplash.com/photo-1513151233558-d860c5398176',
  ],
  'Printers & Ink': [
    'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6',
    'https://images.unsplash.com/photo-1562976540-1502c2145186',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3',
  ],
  'Office Furniture': [
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7',
  ],
  'Presentation Supplies': [
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12',
    'https://images.unsplash.com/photo-1542744094-3a3172720177',
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d',
  ],
  'Sticky Notes & Labels': [
    'https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f',
    'https://images.unsplash.com/photo-1517842645767-c639042777db',
    'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd',
  ],
  'Filing & Storage': [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2',
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3',
  ],
  'Scissors & Cutters': [
    'https://images.unsplash.com/photo-1503792501406-2c40da09e1e2',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f',
    'https://images.unsplash.com/photo-1513151233558-d860c5398176',
  ],
  'Desk Lamps': [
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15',
    'Mobile Phones',
    'Laptops & Computers',
    'Tablets',
    'Headphones & Earbuds',
    'Cameras & Photography',
    'Smart Watches',
    'Televisions',
    'Speakers & Audio',
    'Gaming Accessories',
    'Cables & Adapters',
  ],
  Apparel: [
    "Men's Clothing",
    "Women's Clothing",
    "Kids' Clothing",
    'Footwear',
    'Watches',
    'Sunglasses',
    'Handbags & Wallets',
    'Jewellery',
    'Ethnic Wear',
    'Winter Wear',
  ],
  'Home & Kitchen': [
    'Kitchen Appliances',
    'Cookware & Dining',
    'Home Decor',
    'Bedding & Mattresses',
    'Lighting',
    'Storage & Organization',
    'Cleaning Supplies',
    'Furniture',
    'Garden & Outdoor',
    'Smart Home',
  ],
  Beauty: [
    'Skincare',
    'Haircare',
    'Makeup',
    'Fragrances',
    'Bath & Body',
    "Men's Grooming",
    'Oral Care',
    'Health & Wellness',
    'Appliances',
    'Luxury Beauty',
  ],
  Sports: [
    'Cricket',
    'Fitness & Gym',
    'Football',
    'Badminton',
    'Cycling',
    'Running Shoes',
    'Camping & Hiking',
    'Yoga & Meditation',
    'Swimming',
    'Sports Nutrition',
  ],
  Books: [
    'Fiction',
    'Non-Fiction',
    'Academic & Textbooks',
    "Children's Books",
    'Comics & Manga',
    'Self Help',
    'Notebooks & Diaries',
    'Pens & Writing',
    'Art Supplies',
    'Office Supplies',
  ],
  'Toys & Games': [
    'Action Figures',
    'Board Games',
    'Building Blocks',
    'Dolls & Playsets',
    'Educational Toys',
    'Remote Control Toys',
    'Puzzles',
    'Outdoor Play',
    'Card Games',
    'Plush Toys',
  ],
  Grocery: [
    'Snacks & Beverages',
    'Staples & Cooking',
    'Dairy & Eggs',
    'Fruits & Vegetables',
    'Packaged Foods',
    'Organic & Natural',
    'Tea & Coffee',
    'Spices & Masalas',
    'Chocolates & Sweets',
    'International Foods',
  ],
  Automotive: [
    'Car Accessories',
    'Bike Accessories',
    'Car Electronics',
    'Tyres & Rims',
    'Oils & Lubricants',
    'Helmets & Gear',
    'Car Care',
    'Tools & Equipment',
    'Interior Accessories',
    'GPS & Navigation',
  ],
  'Pet Supplies': [
    'Dog Food',
    'Cat Food',
    'Pet Toys',
    'Grooming',
    'Beds & Furniture',
    'Collars & Leashes',
    'Aquarium Supplies',
    'Bird Supplies',
    'Health & Hygiene',
    'Training & Travel',
  ],
  'Office Supplies': [
    'Notebooks & Paper',
    'Pens & Writing',
    'Desk Organizers',
    'Printers & Ink',
    'Office Furniture',
    'Presentation Supplies',
    'Sticky Notes & Labels',
    'Filing & Storage',
    'Scissors & Cutters',
    'Desk Lamps',
  ],
};

const BRAND_PREFIXES = [
  'Pro',
  'Ultra',
  'Apex',
  'Prime',
  'Elite',
  'Aura',
  'Max',
  'Eco',
  'Nexus',
  'Zenith',
  'Optima',
  'Vortex',
  'Titan',
  'Starlight',
  'Velvet',
  'Urban',
  'Classic',
  'Grand',
  'Omni',
  'Nova',
];

const QUALITY_MODIFIERS = [
  'Heavy Duty',
  'Premium Quality',
  'Professional Series',
  'Ergonomic',
  'Compact',
  'Waterproof',
  'Wireless',
  'Organic',
  'High Performance',
  'Deluxe Edition',
  'Multi-Functional',
  'Portable',
  'Sleek & Durable',
  'Handcrafted',
  'Advanced Formula',
];

const WHOLESALER_DEFINITIONS = [
  {
    name: 'Sheikh Tech Imports',
    email: 'sheikh.tech@nexcart.com',
    businessName: 'Sheikh Tech & Electronics Wholesale',
  },
  {
    name: 'Sheikh Apparel House',
    email: 'sheikh.apparel@nexcart.com',
    businessName: 'Sheikh Textiles & Fashion Hub',
  },
  {
    name: 'Sheikh Home Depot',
    email: 'sheikh.home@nexcart.com',
    businessName: 'Sheikh Home & Kitchen Supplies',
  },
  {
    name: 'Sheikh Beauty Care',
    email: 'sheikh.beauty@nexcart.com',
    businessName: 'Sheikh Cosmetics & Beauty Traders',
  },
  {
    name: 'Sheikh Active Sports',
    email: 'sheikh.sports@nexcart.com',
    businessName: 'Sheikh Sports & Fitness Gear',
  },
  {
    name: 'Sheikh Book Emporium',
    email: 'sheikh.books@nexcart.com',
    businessName: 'Sheikh Publishers & Books Wholesale',
  },
  {
    name: 'Sheikh Toy World',
    email: 'sheikh.toys@nexcart.com',
    businessName: 'Sheikh Toyland & Games Distributors',
  },
  {
    name: 'Sheikh Fresh Groceries',
    email: 'sheikh.grocery@nexcart.com',
    businessName: 'Sheikh Daily Essentials & Grocery',
  },
  {
    name: 'Sheikh Auto Spares',
    email: 'sheikh.auto@nexcart.com',
    businessName: 'Sheikh Motors & Automotive Wholesale',
  },
  {
    name: 'Sheikh Pet Palace',
    email: 'sheikh.pets@nexcart.com',
    businessName: 'Sheikh Pet Care & Food Wholesale',
  },
  {
    name: 'Sheikh Office Express',
    email: 'sheikh.office@nexcart.com',
    businessName: 'Sheikh Stationery & Office Mart',
  },
  {
    name: 'Sheikh Global Enterprise',
    email: 'sheikh.global@nexcart.com',
    businessName: 'Sheikh Global Multi-Category Wholesale',
  },
  {
    name: 'Sheikh Metro Wholesale',
    email: 'sheikh.metro@nexcart.com',
    businessName: 'Sheikh Metro B2B Superstore',
  },
  {
    name: 'Sheikh Prime Traders',
    email: 'sheikh.prime@nexcart.com',
    businessName: 'Sheikh Prime Bulk Merchants',
  },
  {
    name: 'Sheikh Apex Logistics',
    email: 'sheikh.apex@nexcart.com',
    businessName: 'Sheikh Apex Commercial Goods',
  },
];

function getRandomItem(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBasePrice(category) {
  switch (category) {
    case 'Electronics':
      return getRandomNumber(150, 2500);
    case 'Apparel':
      return getRandomNumber(20, 350);
    case 'Home & Kitchen':
      return getRandomNumber(30, 800);
    case 'Beauty':
      return getRandomNumber(10, 180);
    case 'Sports':
      return getRandomNumber(25, 450);
    case 'Books':
      return getRandomNumber(8, 90);
    case 'Toys & Games':
      return getRandomNumber(12, 200);
    case 'Grocery':
      return getRandomNumber(5, 75);
    case 'Automotive':
      return getRandomNumber(35, 950);
    case 'Pet Supplies':
      return getRandomNumber(10, 140);
    case 'Office Supplies':
      return getRandomNumber(8, 250);
    default:
      return getRandomNumber(20, 200);
  }
}

function getSizes(category, subcategory) {
  if (category === 'Apparel') {
    if (subcategory === 'Footwear') return ['7', '8', '9', '10', '11', '12'];
    return ['S', 'M', 'L', 'XL', 'XXL'];
  }
  if (category === 'Sports' && subcategory === 'Running Shoes') {
    return ['7', '8', '9', '10', '11'];
  }
  return [];
}

const CATEGORY_FALLBACK_IMAGES = {
  Electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
  Apparel: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
  'Home & Kitchen': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f',
  Beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
  Sports: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd',
  Books: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6',
  'Toys & Games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7',
  Grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
  Automotive: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b',
  'Pet Supplies': 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7',
  'Office Supplies': 'https://images.unsplash.com/photo-1513151233558-d860c5398176',
};

// Function to generate unique, relevant image URL for each product
function getProductImageUrl(category, subcategory, productIndex) {
  const images = SUBCATEGORY_IMAGES[subcategory];
  const basePhoto =
    images && images.length > 0
      ? images[productIndex % images.length]
      : CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Electronics;

  return `${basePhoto}?w=600&auto=format&fit=crop&q=80&sig=${productIndex}`;
}

async function main() {
  console.log(
    '🚀 Initializing database reset & 8,000 product seeding with subcategory-level unique images...'
  );
  const startTime = Date.now();

  // 1. Truncate all tables safely
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
    `);
    const tableNames = res.rows.map((row) => `"${row.tablename}"`);
    if (tableNames.length > 0) {
      await client.query(`TRUNCATE TABLE ${tableNames.join(', ')} CASCADE;`);
      console.log('🧹 Cleaned existing database records.');
    }
  } finally {
    client.release();
    await pool.end();
  }

  // 2. Hash Password Sheikh@1230 once
  console.log('🔐 Hashing password Sheikh@1230...');
  const hashedPassword = await bcrypt.hash('Sheikh@1230', 10);

  // 3. Create Super Admin & Demo Customer
  console.log('👑 Creating Super Admin and Demo Customer...');
  await prisma.user.create({
    data: {
      name: 'Sheikh Super Admin',
      email: 'admin@nexcart.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      emailVerified: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Demo Customer',
      email: 'customer@nexcart.com',
      password: hashedPassword,
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });

  // 4. Create 15 Wholesaler Users & Profiles
  console.log('🏢 Creating 15 Wholesalers with password Sheikh@1230...');
  const wholesalerProfiles = [];

  for (let i = 0; i < WHOLESALER_DEFINITIONS.length; i++) {
    const def = WHOLESALER_DEFINITIONS[i];
    const createdUser = await prisma.user.create({
      data: {
        name: def.name,
        email: def.email,
        password: hashedPassword,
        role: 'WHOLESALER',
        emailVerified: true,
        wholesalerProfile: {
          create: {
            businessName: def.businessName,
            businessPhone: `+91 98${getRandomNumber(10000000, 99999999)}`,
            taxId: `27AAACS${getRandomNumber(1000, 9999)}1Z${getRandomNumber(1, 9)}`,
            businessAddress: `${getRandomNumber(10, 999)} Wholesale Complex, Commercial Hub, Sector ${getRandomNumber(1, 50)}`,
            onboardingStatus: 'ACTIVE',
            deliveryFee: getRandomNumber(0, 50),
            freeDeliveryThreshold: getRandomNumber(500, 2000),
          },
        },
      },
      include: { wholesalerProfile: true },
    });
    wholesalerProfiles.push(createdUser.wholesalerProfile);
  }

  console.log(`✅ Successfully created ${wholesalerProfiles.length} Wholesaler accounts.`);

  // 5. Generate ~8,000 Products across all categories & subcategories
  console.log('📦 Generating 8,000 Products with accurate subcategory images...');

  const categories = Object.keys(CATEGORY_SUBCATEGORIES);
  const TOTAL_PRODUCTS = 8000;
  const productsPerCategory = Math.ceil(TOTAL_PRODUCTS / categories.length);

  let allProducts = [];
  let productCounter = 1;

  for (const category of categories) {
    const subcategories = CATEGORY_SUBCATEGORIES[category];
    const productsPerSubcategory = Math.ceil(productsPerCategory / subcategories.length);

    for (const subcategory of subcategories) {
      for (let i = 0; i < productsPerSubcategory; i++) {
        if (allProducts.length >= TOTAL_PRODUCTS) break;

        const wholesaler = getRandomItem(wholesalerProfiles);
        const prefix = getRandomItem(BRAND_PREFIXES);
        const modifier = getRandomItem(QUALITY_MODIFIERS);
        const price = getBasePrice(category);
        const costPrice = Math.round(price * (getRandomNumber(60, 80) / 100));
        const actualPrice = Math.round(price * (getRandomNumber(115, 140) / 100));

        const name = `${prefix} ${modifier} ${subcategory} Vol.${(i % 50) + 1}`;
        const sku = `SKU-${category.slice(0, 3).toUpperCase()}-${String(productCounter).padStart(5, '0')}`;
        const imageUrl = getProductImageUrl(category, subcategory, productCounter);
        const sizes = getSizes(category, subcategory);

        allProducts.push({
          wholesalerId: wholesaler.id,
          name,
          description: `High-grade ${subcategory.toLowerCase()} product under ${category} category. Built for heavy commercial use and bulk wholesale ordering with verified quality guarantee.`,
          price: parseFloat(price.toFixed(2)),
          costPrice: parseFloat(costPrice.toFixed(2)),
          actualPrice: parseFloat(actualPrice.toFixed(2)),
          sku,
          imageUrl,
          category,
          subcategory,
          sizes,
          currentStock: getRandomNumber(30, 600),
          minStock: getRandomNumber(10, 50),
          isB2BEnabled: true,
          minOrderQty: getRandomNumber(1, 10),
          deliveryFee: getRandomNumber(0, 35),
        });

        productCounter++;
      }
      if (allProducts.length >= TOTAL_PRODUCTS) break;
    }
    if (allProducts.length >= TOTAL_PRODUCTS) break;
  }

  console.log(`⚡ Inserting ${allProducts.length} products in bulk batches...`);

  const BATCH_SIZE = 1000;
  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const chunk = allProducts.slice(i, i + BATCH_SIZE);
    await prisma.product.createMany({
      data: chunk,
    });
    console.log(`   - Batch ${Math.floor(i / BATCH_SIZE) + 1} inserted (${chunk.length} products)`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 RE-SEEDING COMPLETE in ${duration}s!`);
  console.log(
    `   - 15 Wholesalers & All Products updated with subcategory-specific unique images.`
  );
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
