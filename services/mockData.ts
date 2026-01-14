import { PurchaseRecord } from '../types';

// Helper to generate random dates within range
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const DEPARTMENTS = ["杂货", "菜部", "冻部", "肉部", "鱼部", "厨房", "牛奶生鲜", "酒水", "面包"];
const COMPANIES = ["Sysco", "Costco", "Metro", "Gordon Food Service", "Local Farm A", "Seafood Traders Inc", "Asian Import Co", "Bakery Supplies Ltd", "Dairy Queen Suppliers", "Coca Cola", "Pepsi Co"];

// Generate 500 mock records
export const generateMockData = (): PurchaseRecord[] => {
  const records: PurchaseRecord[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2025-06-30');

  for (let i = 0; i < 800; i++) {
    const invoiceDate = randomDate(startDate, endDate);
    const amount = Math.floor(Math.random() * 5000) + 100;
    
    // Introduce some "cleared" data
    const isCleared = Math.random() > 0.95 ? 1 : 0;

    records.push({
      id: `inv-${i}`,
      companyName: COMPANIES[Math.floor(Math.random() * COMPANIES.length)],
      department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
      invoiceDate: invoiceDate.toISOString(),
      invoiceAmount: amount,
      invoiceNumber: `INV-${10000 + i}`,
      clearFlag: isCleared,
      checkNumber: isCleared ? 'VOID' : `CHK-${5000 + i}`,
      actualPaidAmount: isCleared ? undefined : amount,
    });
  }
  return records;
};