
import { GoogleGenAI } from "@google/genai";
import { Transaction, Category, TransactionType } from '../types';

// Safely access process.env.API_KEY to prevent browser crashes
let API_KEY: string | undefined;
try {
  API_KEY = process.env.API_KEY;
} catch (e) {
  console.warn("process.env.API_KEY is not accessible in this environment.");
  API_KEY = undefined;
}


if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this example, we'll log an error.
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getFinancialInsights = async (transactions: Transaction[], categories: Category[]): Promise<string> => {
    if (!API_KEY) {
        return "Tính năng AI không khả dụng. Vui lòng định cấu hình khóa API của bạn.";
    }

    const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE);

    if (expenseTransactions.length < 5) {
        return "Chưa đủ dữ liệu chi tiêu để tạo thông tin chi tiết. Hãy thêm một vài giao dịch nữa.";
    }

    const totalExpense = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
    const categorySpends: { [key: string]: number } = {};
    
    expenseTransactions.forEach(t => {
        const category = categories.find(c => c.id === t.categoryId);
        if (category) {
            if (categorySpends[category.name]) {
                categorySpends[category.name] += t.amount;
            } else {
                categorySpends[category.name] = t.amount;
            }
        }
    });

    const topCategories = Object.entries(categorySpends)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, amount]) => `${name}: ${amount.toLocaleString('vi-VN')} VND`)
        .join(', ');

    const prompt = `
        Dựa trên bản tóm tắt chi tiêu sau đây bằng tiếng Việt, hãy đưa ra ba mẹo hữu ích, ngắn gọn để tiết kiệm tiền. 
        Hãy trả lời bằng tiếng Việt.
        - Tổng chi tiêu gần đây: ${totalExpense.toLocaleString('vi-VN')} VND
        - Các hạng mục chi tiêu hàng đầu: ${topCategories}

        Ví dụ về định dạng phản hồi mong muốn:
        1. Mẹo một ở đây.
        2. Mẹo hai ở đây.
        3. Mẹo ba ở đây.
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "Rất tiếc, đã xảy ra lỗi khi tạo thông tin chi tiết về tài chính.";
    }
};