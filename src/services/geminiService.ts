import { GoogleGenAI } from "@google/genai";
import { SaleRecord, PromoInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generatePromoInsights(
  salesData: SaleRecord[], 
  context: { weather: string, holiday?: string, headlines?: string[] }
): Promise<PromoInsight[]> {
  // Aggregate products
  const productCounts: Record<string, number> = {};
  salesData.forEach(sale => {
    sale.items.forEach(item => {
      productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
    });
  });

  const topItems = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name, count]) => `${name} (${count} units)`)
    .join(', ');

  const bottomItems = Object.entries(productCounts)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 20)
    .map(([name, count]) => `${name} (${count} units)`)
    .join(', ');
  
  const prompt = `
    You are a Retail Operations and Marketing Strategist for Kam Man Supermarket.
    Analyze our live sales data to provide exactly 3 actionable business insights.
    
    1. HIGH VELOCITY (Top Sellers): ${topItems}
    2. LOW VELOCITY (Cold Items): ${bottomItems}
    
    Context:
    - Weather: ${context.weather}
    - Major Holidays: ${context.holiday || 'None Soon'}
    - Industry Headlines: ${context.headlines?.join(', ') || 'N/A'}
    
    Insight Requirements:
    - Insight 1: INVENTORY FOCUS (What high-volume item needs a restock or backup vendor?)
    - Insight 2: CLEARANCE/PROMO FOCUS (Suggest a pairing or discount to move one of the LOW VELOCITY items)
    - Insight 3: TREND/EVENT FOCUS (Suggest a lifestyle promo based on weather or holidays)

    Return a JSON array of exactly 3 objects:
    interface PromoInsight {
      id: string;
      title: string;
      description: string;
      rationale: string;
      potentialImpact: 'Low' | 'Medium' | 'High';
      category: 'Promotion' | 'Ad' | 'Pop-up';
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Error generating insights:", error);
    return [];
  }
}
