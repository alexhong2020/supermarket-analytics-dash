import { SaleRecord } from "./types";

// Helper to generate a realistic timestamp spread
const generateTimestamp = (day: number, hour: number, minute: number) => {
  return `2026-02-0${day}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`;
};

const ITEMS_POOL = [
  { sku: '2001', name: 'Jasmine Rice 茉莉香米', nameZh: '茉莉香米', dept: 'Grocery', price: 18.99 },
  { sku: '3001', name: 'Dish Soap 洗洁精', nameZh: '洗洁精', dept: 'Nonfood', price: 3.49 },
  { sku: '4001', name: 'Imported Snack 进口零食', nameZh: '进口零食', dept: 'Grocery TX', price: 5.99 },
  { sku: '5001', name: 'Ginseng Tea 人参茶', nameZh: '人参茶', dept: 'Herbal', price: 12.50 },
  { sku: '6001', name: 'Roast Duck 烧鸭', nameZh: '烧鸭', dept: 'Deli', price: 28.00 },
  { sku: '9001', name: 'Green Tea 绿茶', nameZh: '绿茶', dept: 'Tea', price: 8.99 },
  { sku: '1201', name: 'BBQ Pork 叉烧', nameZh: '叉烧', dept: 'BBQ', price: 15.99 },
  { sku: '1701', name: 'Bok Choy 青江菜', nameZh: '青江菜', dept: 'Fresh Grocery', price: 1.29 },
  { sku: '1901', name: 'Specialty Sauce 特色酱料', nameZh: '特色酱料', dept: 'Speciality', price: 6.49 },
  { sku: '2101', name: 'Egg Noodles 鸡蛋面', nameZh: '鸡蛋面', dept: 'Noodle', price: 2.99 },
];

const generateMockSales = (): SaleRecord[] => {
  return []; // Cleared as requested
};

export const MOCK_SALES_LOG: SaleRecord[] = generateMockSales();

export const TOP_CATEGORIES: { name: string, value: number }[] = [];
