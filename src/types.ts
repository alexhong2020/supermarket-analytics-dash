export interface LineItem {
  id: string;
  sku: string;
  name: string;
  nameZh: string;
  department: string;
  price: number;
  quantity: number;
  amount: number;
}

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: LineItem[];
  totalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'OTC';
  memberId?: string;
}

export interface PromoInsight {
  id: string;
  title: string;
  description: string;
  rationale: string;
  potentialImpact: 'Low' | 'Medium' | 'High';
  category: 'Promotion' | 'Ad' | 'Pop-up';
}

export type Language = 'en' | 'zh';
