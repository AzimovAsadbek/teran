/**
 * DEMONSTRATION ACTIVITY — fictional customers, orders, enquiries and newsletter subscribers, so
 * the admin area has something to show. Loaded only by `db:seed:demo`, never by the default seed.
 *
 * Every person and company here is invented and marked as such:
 * - e-mail addresses use example.com, a domain reserved for documentation (RFC 2606);
 * - phone numbers follow the +998 90 000 0X XX pattern;
 * - order numbers start with TRN-DEMO (real order numbers never contain the letter O);
 * - companies carry "(demo)" and newsletter sign-ups have the source "demo".
 * Demo customer accounts cannot sign in (see activity.ts) and nothing is ever sent to anyone.
 */
import type { Locale } from '@teran/contracts';

export const DEMO_ORDER_PREFIX = 'TRN-DEMO';
export const DEMO_SOURCE = 'demo';

export interface DemoCustomer {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  locale: Locale;
  joinedDaysAgo: number;
}

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    email: 'dilnoza.karimova@example.com',
    firstName: 'Dilnoza',
    lastName: 'Karimova',
    phone: '+998900000101',
    locale: 'uz',
    joinedDaysAgo: 58,
  },
  {
    email: 'aziz.rahimov@example.com',
    firstName: 'Aziz',
    lastName: 'Rahimov',
    phone: '+998900000102',
    locale: 'uz',
    joinedDaysAgo: 51,
  },
  {
    email: 'elena.sokolova@example.com',
    firstName: 'Elena',
    lastName: 'Sokolova',
    phone: '+998900000103',
    locale: 'ru',
    joinedDaysAgo: 44,
  },
  {
    email: 'jasur.tursunov@example.com',
    firstName: 'Jasur',
    lastName: 'Tursunov',
    phone: '+998900000104',
    locale: 'uz',
    joinedDaysAgo: 37,
  },
  {
    email: 'malika.yusupova@example.com',
    firstName: 'Malika',
    lastName: 'Yusupova',
    phone: '+998900000105',
    locale: 'uz',
    joinedDaysAgo: 30,
  },
  {
    email: 'timur.akhmedov@example.com',
    firstName: 'Timur',
    lastName: 'Akhmedov',
    phone: '+998900000106',
    locale: 'ru',
    joinedDaysAgo: 26,
  },
  {
    email: 'sarah.miller@example.com',
    firstName: 'Sarah',
    lastName: 'Miller',
    phone: '+998900000107',
    locale: 'en',
    joinedDaysAgo: 21,
  },
  {
    email: 'bobur.qodirov@example.com',
    firstName: 'Bobur',
    lastName: 'Qodirov',
    phone: '+998900000108',
    locale: 'uz',
    joinedDaysAgo: 12,
  },
];

export type DemoOrderStatus =
  'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface DemoOrder {
  number: string;
  /** Hours between the order being placed and the moment the seed runs. */
  ageHours: number;
  /** A demo customer's e-mail, or the details a guest typed at checkout. */
  customer: string | { name: string; phone: string; email?: string };
  locale: Locale;
  delivery: {
    method: 'courier-tashkent' | 'regions';
    regionCode: string;
    city: string;
    addressLine: string;
    landmark?: string;
  };
  items: { sku: string; quantity: number }[];
  status: DemoOrderStatus;
  /** Cash collected and recorded by staff (delivered orders only). */
  paid?: boolean;
  /** For cancelled orders: the status it was cancelled from, and the reason staff gave. */
  cancelled?: { from: 'PENDING' | 'CONFIRMED'; reason: string };
  note?: string;
}

/**
 * When each step happened, in hours after the order was placed. Regional deliveries take longer.
 * Cancellations happen a few hours after the step they interrupt.
 */
export const DEMO_TIMELINE = {
  CONFIRMED: 2,
  PROCESSING: 18,
  SHIPPED: 28,
  DELIVERED: { 'courier-tashkent': 52, regions: 110 },
  PAID_AFTER_DELIVERY: 1,
  CANCELLED: { PENDING: 3, CONFIRMED: 6 },
} as const;

const tashkent = (addressLine: string, landmark?: string) => ({
  method: 'courier-tashkent' as const,
  regionCode: 'UZ-TK',
  city: 'Toshkent',
  addressLine,
  ...(landmark ? { landmark } : {}),
});

const region = (regionCode: string, city: string, addressLine: string) => ({
  method: 'regions' as const,
  regionCode,
  city,
  addressLine,
});

export const DEMO_ORDERS: DemoOrder[] = [
  {
    number: 'TRN-DEMO0001',
    ageHours: 44 * 24 + 3,
    customer: 'dilnoza.karimova@example.com',
    locale: 'uz',
    delivery: tashkent('Namuna koʻchasi, 12-uy, 5-xonadon', 'Bozor yonida'),
    items: [
      { sku: 'TRN-XC2025-400', quantity: 2 },
      { sku: 'TRN-G8810-400', quantity: 1 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0002',
    ageHours: 42 * 24 + 6,
    customer: { name: 'Rustam Aliyev', phone: '+998900000201' },
    locale: 'uz',
    delivery: region('UZ-NG', 'Namangan', 'Namuna koʻchasi, 3-uy'),
    items: [
      { sku: 'TRN-8800-400', quantity: 1 },
      { sku: 'TRN-8830-400', quantity: 2 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0003',
    ageHours: 39 * 24 + 2,
    customer: 'elena.sokolova@example.com',
    locale: 'ru',
    delivery: tashkent('ул. Намуна, 8, кв. 14'),
    items: [
      { sku: 'TRN-8009-400', quantity: 2 },
      { sku: 'TRN-XC2025-400', quantity: 1 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0004',
    ageHours: 37 * 24 + 5,
    customer: 'aziz.rahimov@example.com',
    locale: 'uz',
    delivery: region('UZ-SA', 'Samarqand', 'Namuna koʻchasi, 21-uy'),
    items: [{ sku: 'TRN-G8810-400', quantity: 2 }],
    status: 'CANCELLED',
    cancelled: { from: 'PENDING', reason: 'Mijoz telefon orqali bekor qildi.' },
  },
  {
    number: 'TRN-DEMO0005',
    ageHours: 33 * 24 + 4,
    customer: { name: 'Gulnora Ismoilova', phone: '+998900000202' },
    locale: 'uz',
    delivery: tashkent('Namuna koʻchasi, 40-uy'),
    items: [
      { sku: 'TRN-8800-400', quantity: 1 },
      { sku: 'TRN-G8810-400', quantity: 1 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0006',
    ageHours: 31 * 24 + 1,
    customer: 'jasur.tursunov@example.com',
    locale: 'uz',
    delivery: region('UZ-FA', 'Fargʻona', 'Namuna koʻchasi, 7-uy'),
    items: [
      { sku: 'TRN-8800-400', quantity: 1 },
      { sku: 'TRN-8830-400', quantity: 1 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0007',
    ageHours: 29 * 24 + 7,
    customer: 'malika.yusupova@example.com',
    locale: 'uz',
    delivery: tashkent('Namuna koʻchasi, 15-uy, 22-xonadon'),
    items: [
      { sku: 'TRN-XC2025-400', quantity: 2 },
      { sku: 'TRN-8009-400', quantity: 1 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0008',
    ageHours: 27 * 24 + 3,
    customer: { name: 'Oleg Petrov', phone: '+998900000203' },
    locale: 'ru',
    delivery: tashkent('ул. Намуна, 2, офис 5'),
    items: [{ sku: 'TRN-XC2025-400', quantity: 6 }],
    status: 'DELIVERED',
    paid: true,
    note: 'Позвоните за час до доставки.',
  },
  {
    number: 'TRN-DEMO0009',
    ageHours: 25 * 24 + 2,
    customer: 'timur.akhmedov@example.com',
    locale: 'ru',
    delivery: region('UZ-AN', 'Андижан', 'ул. Намуна, 11'),
    items: [
      { sku: 'TRN-8009-400', quantity: 1 },
      { sku: 'TRN-8830-400', quantity: 1 },
    ],
    // Delivered but the cash has not been recorded yet: shows the "record payment" action.
    status: 'DELIVERED',
  },
  {
    number: 'TRN-DEMO0010',
    ageHours: 23 * 24 + 6,
    customer: 'dilnoza.karimova@example.com',
    locale: 'uz',
    delivery: tashkent('Namuna koʻchasi, 12-uy, 5-xonadon', 'Bozor yonida'),
    items: [{ sku: 'TRN-G8810-400', quantity: 2 }],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0011',
    ageHours: 21 * 24 + 4,
    customer: { name: 'Kamola Ergasheva', phone: '+998900000204' },
    locale: 'uz',
    delivery: region('UZ-BU', 'Buxoro', 'Namuna koʻchasi, 9-uy'),
    items: [
      { sku: 'TRN-8800-400', quantity: 1 },
      { sku: 'TRN-8830-400', quantity: 1 },
    ],
    status: 'CANCELLED',
    cancelled: { from: 'CONFIRMED', reason: 'Mijoz bilan bogʻlanib boʻlmadi.' },
  },
  {
    number: 'TRN-DEMO0012',
    ageHours: 19 * 24 + 1,
    customer: 'sarah.miller@example.com',
    locale: 'en',
    delivery: tashkent('Namuna Street 30, apartment 4'),
    items: [
      { sku: 'TRN-8830-400', quantity: 1 },
      { sku: 'TRN-8009-400', quantity: 1 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0013',
    ageHours: 17 * 24 + 5,
    customer: 'aziz.rahimov@example.com',
    locale: 'uz',
    delivery: region('UZ-SA', 'Samarqand', 'Namuna koʻchasi, 21-uy'),
    items: [{ sku: 'TRN-XC2025-400', quantity: 2 }],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0014',
    ageHours: 15 * 24 + 3,
    customer: { name: 'Sherzod Nazarov', phone: '+998900000205' },
    locale: 'uz',
    delivery: region('UZ-TO', 'Chirchiq', 'Namuna koʻchasi, 5-uy'),
    items: [{ sku: 'TRN-G8810-400', quantity: 3 }],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0015',
    ageHours: 13 * 24 + 2,
    customer: 'elena.sokolova@example.com',
    locale: 'ru',
    delivery: tashkent('ул. Намуна, 8, кв. 14'),
    items: [
      { sku: 'TRN-8830-400', quantity: 1 },
      { sku: 'TRN-G8810-400', quantity: 2 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0016',
    ageHours: 11 * 24 + 6,
    customer: 'bobur.qodirov@example.com',
    locale: 'uz',
    delivery: region('UZ-NG', 'Namangan', 'Namuna koʻchasi, 18-uy'),
    items: [
      { sku: 'TRN-G8810-400', quantity: 2 },
      { sku: 'TRN-XC2025-400', quantity: 1 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0017',
    ageHours: 9 * 24 + 4,
    customer: 'jasur.tursunov@example.com',
    locale: 'uz',
    delivery: tashkent('Namuna koʻchasi, 27-uy'),
    items: [
      { sku: 'TRN-8800-400', quantity: 1 },
      { sku: 'TRN-XC2025-400', quantity: 1 },
    ],
    status: 'DELIVERED',
    paid: true,
  },
  {
    number: 'TRN-DEMO0018',
    ageHours: 7 * 24 + 2,
    customer: { name: 'Nodira Saidova', phone: '+998900000206' },
    locale: 'uz',
    delivery: tashkent('Namuna koʻchasi, 33-uy'),
    items: [
      { sku: 'TRN-8830-400', quantity: 1 },
      { sku: 'TRN-8009-400', quantity: 1 },
    ],
    status: 'CANCELLED',
    cancelled: { from: 'PENDING', reason: 'Takroriy buyurtma.' },
  },
  {
    number: 'TRN-DEMO0019',
    ageHours: 5 * 24 + 5,
    customer: 'malika.yusupova@example.com',
    locale: 'uz',
    delivery: region('UZ-XO', 'Urganch', 'Namuna koʻchasi, 2-uy'),
    items: [
      { sku: 'TRN-8009-400', quantity: 1 },
      { sku: 'TRN-8800-400', quantity: 1 },
    ],
    status: 'SHIPPED',
  },
  {
    number: 'TRN-DEMO0020',
    ageHours: 3 * 24 + 3,
    customer: 'timur.akhmedov@example.com',
    locale: 'ru',
    delivery: tashkent('ул. Намуна, 19, кв. 3'),
    items: [{ sku: 'TRN-8009-400', quantity: 2 }],
    status: 'SHIPPED',
  },
  {
    number: 'TRN-DEMO0021',
    ageHours: 2 * 24 + 1,
    customer: { name: 'Anvar Mirzayev', phone: '+998900000207' },
    locale: 'uz',
    delivery: region('UZ-NG', 'Namangan', 'Namuna koʻchasi, 44-uy'),
    items: [{ sku: 'TRN-G8810-400', quantity: 3 }],
    status: 'PROCESSING',
  },
  {
    number: 'TRN-DEMO0022',
    ageHours: 26,
    customer: 'sarah.miller@example.com',
    locale: 'en',
    delivery: tashkent('Namuna Street 30, apartment 4'),
    items: [
      { sku: 'TRN-XC2025-400', quantity: 1 },
      { sku: 'TRN-8830-400', quantity: 1 },
    ],
    status: 'CONFIRMED',
  },
  {
    number: 'TRN-DEMO0023',
    ageHours: 5,
    customer: 'dilnoza.karimova@example.com',
    locale: 'uz',
    delivery: tashkent('Namuna koʻchasi, 12-uy, 5-xonadon', 'Bozor yonida'),
    items: [{ sku: 'TRN-XC2025-400', quantity: 1 }],
    status: 'PENDING',
    note: 'Iltimos, sovgʻa sifatida qadoqlang.',
  },
  {
    number: 'TRN-DEMO0024',
    ageHours: 1,
    customer: { name: 'Farrux Hamidov', phone: '+998900000208' },
    locale: 'uz',
    delivery: tashkent('Namuna koʻchasi, 6-uy'),
    items: [
      { sku: 'TRN-XC2025-400', quantity: 2 },
      { sku: 'TRN-G8810-400', quantity: 1 },
    ],
    status: 'PENDING',
  },
];

export interface DemoContactInquiry {
  name: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  locale: Locale;
  ageHours: number;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';
  internalNote?: string;
}

export const DEMO_CONTACT_INQUIRIES: DemoContactInquiry[] = [
  {
    name: 'Laylo Hasanova',
    email: 'laylo.hasanova@example.com',
    subject: 'Yetkazib berish',
    message:
      'Assalomu alaykum! Qoʻqonga ham yetkazib berasizlarmi va buyurtma taxminan necha kunda yetib keladi?',
    locale: 'uz',
    ageHours: 20,
    status: 'NEW',
  },
  {
    name: 'Andrey Kim',
    email: 'andrey.kim@example.com',
    subject: 'Подарочная упаковка',
    message: 'Здравствуйте! Можно ли оформить подарочную упаковку для заказа из трёх чаёв?',
    locale: 'ru',
    ageHours: 3,
    status: 'NEW',
  },
  {
    name: 'Shahnoza Valiyeva',
    phone: '+998900000301',
    subject: 'Buyurtma holati',
    message: 'Kecha buyurtma bergandim. Qachon yetib kelishini bilsam boʻladimi?',
    locale: 'uz',
    ageHours: 4 * 24,
    status: 'IN_PROGRESS',
    internalNote: 'Kuryer bilan bogʻlanildi, buyurtma yoʻlda.',
  },
  {
    name: 'James Carter',
    email: 'james.carter@example.com',
    subject: 'Brewing question',
    message: 'Hello! How many times can I steep the oolong, and should the water be boiling?',
    locale: 'en',
    ageHours: 12 * 24,
    status: 'RESOLVED',
    internalNote: 'Replied with the general brewing guidance from the journal.',
  },
  {
    name: 'Ozoda Rasulova',
    email: 'ozoda.rasulova@example.com',
    subject: 'Hamkorlik',
    message: 'Doʻkonimiz uchun choy olmoqchimiz. Kimga murojaat qilsak boʻladi?',
    locale: 'uz',
    ageHours: 20 * 24,
    status: 'RESOLVED',
    internalNote: 'Ulgurji soʻrov formasiga yoʻnaltirildi.',
  },
  {
    name: 'SEO Promo',
    email: 'seo.promo@example.com',
    subject: 'Promotion',
    message: 'We can bring your website to the first page of search results. Reply for prices.',
    locale: 'en',
    ageHours: 8 * 24,
    status: 'SPAM',
  },
];

export interface DemoWholesaleInquiry {
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  businessType: 'CAFE_RESTAURANT' | 'HOTEL' | 'RETAIL' | 'DISTRIBUTOR' | 'CORPORATE' | 'OTHER';
  regionCode: string;
  city: string;
  monthlyVolume: string;
  message: string;
  locale: Locale;
  ageHours: number;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';
  internalNote?: string;
}

export const DEMO_WHOLESALE_INQUIRIES: DemoWholesaleInquiry[] = [
  {
    companyName: 'Piyola kafe (demo)',
    contactName: 'Botir Usmonov',
    phone: '+998900000401',
    businessType: 'CAFE_RESTAURANT',
    regionCode: 'UZ-TK',
    city: 'Toshkent',
    monthlyVolume: '15 kg',
    message:
      'Kafemiz uchun qora va yashil choyni muntazam olmoqchimiz. Narxlar va yetkazib berish shartlarini yuborsangiz.',
    locale: 'uz',
    ageHours: 6,
    status: 'NEW',
  },
  {
    companyName: 'Vodiy Savdo (demo)',
    contactName: 'Ulugʻbek Karimov',
    phone: '+998900000403',
    businessType: 'DISTRIBUTOR',
    regionCode: 'UZ-NG',
    city: 'Namangan',
    monthlyVolume: '200 kg',
    message: 'Fargʻona vodiysi boʻylab distribyutorlik imkoniyatlari bilan qiziqamiz.',
    locale: 'uz',
    ageHours: 30,
    status: 'NEW',
  },
  {
    companyName: 'Sharq mehmonxonasi (demo)',
    contactName: 'Nigora Alimova',
    phone: '+998900000402',
    email: 'nigora.alimova@example.com',
    businessType: 'HOTEL',
    regionCode: 'UZ-SA',
    city: 'Samarqand',
    monthlyVolume: '300 quti',
    message: 'Mehmonxona xonalari uchun paketchali choy kerak.',
    locale: 'uz',
    ageHours: 3 * 24,
    status: 'IN_PROGRESS',
    internalNote: 'Namunalar yuborish rejalashtirildi.',
  },
  {
    companyName: 'Dasturxon Market (demo)',
    contactName: 'Sardor Toshpoʻlatov',
    phone: '+998900000405',
    businessType: 'RETAIL',
    regionCode: 'UZ-FA',
    city: 'Fargʻona',
    monthlyVolume: '50 kg',
    message: 'Doʻkonimiz uchun sovgʻa toʻplamlari va bargli choy kerak.',
    locale: 'uz',
    ageHours: 6 * 24,
    status: 'IN_PROGRESS',
    internalNote: 'Narxlar roʻyxati yuborildi, javob kutilmoqda.',
  },
  {
    companyName: 'Ofis Servis (demo)',
    contactName: 'Irina Li',
    phone: '+998900000404',
    email: 'irina.li@example.com',
    businessType: 'CORPORATE',
    regionCode: 'UZ-TK',
    city: 'Ташкент',
    monthlyVolume: '40 упаковок',
    message:
      'Ищем чай для офиса на 60 сотрудников, также интересуют подарочные наборы к праздникам.',
    locale: 'ru',
    ageHours: 15 * 24,
    status: 'RESOLVED',
    internalNote: 'Taklif yuborildi.',
  },
];

export interface DemoSubscriber {
  email: string;
  locale: Locale;
  subscribedDaysAgo: number;
  unsubscribedDaysAgo?: number;
}

export const DEMO_SUBSCRIBERS: DemoSubscriber[] = [
  { email: 'dilnoza.karimova@example.com', locale: 'uz', subscribedDaysAgo: 57 },
  { email: 'aziza.tursunova@example.com', locale: 'uz', subscribedDaysAgo: 49 },
  { email: 'elena.sokolova@example.com', locale: 'ru', subscribedDaysAgo: 43 },
  { email: 'kamron.yuldashev@example.com', locale: 'uz', subscribedDaysAgo: 36 },
  {
    email: 'marina.pak@example.com',
    locale: 'ru',
    subscribedDaysAgo: 31,
    unsubscribedDaysAgo: 10,
  },
  { email: 'sarah.miller@example.com', locale: 'en', subscribedDaysAgo: 20 },
  { email: 'otabek.nurmatov@example.com', locale: 'uz', subscribedDaysAgo: 14 },
  {
    email: 'feruza.ahmedova@example.com',
    locale: 'uz',
    subscribedDaysAgo: 11,
    unsubscribedDaysAgo: 4,
  },
  { email: 'david.brown@example.com', locale: 'en', subscribedDaysAgo: 6 },
  { email: 'zarina.qosimova@example.com', locale: 'uz', subscribedDaysAgo: 2 },
];
