import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly model: any;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    // ✅ Model hợp lệ trong v1
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateSuggestion(product: any): Promise<string> {
    try {
      const prompt = `
Bạn là AI tư vấn sản phẩm thông minh trên trang thương mại điện tử.
Sản phẩm hiện tại: ${product.name}.
Mô tả: ${product.description || 'Không có mô tả chi tiết'}.
Hãy viết 1 câu gợi ý ngắn (dưới 60 từ) giới thiệu chi tiết hơn về sản phẩm và về phụ kiện hoặc sản phẩm đi kèm phù hợp.
Tránh lặp lại tên thương hiệu, không nói lan man và nhớ nói tên sản phẩm ra.
`;
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error('Lỗi khi gọi Gemini API:', error);
      return 'Xin lỗi, hiện tại tôi không thể gợi ý được 😢';
    }
  }
}
