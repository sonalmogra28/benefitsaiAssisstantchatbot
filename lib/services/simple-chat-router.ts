/**
 * Simple Chat Router - Streamlined for MVP
 * Handles basic chat functionality without complex ML dependencies
 */

import { logger } from '@/lib/logger';
import { simpleRAGSystem } from '@/lib/ai/simple-rag';

interface ChatResponse {
  content: string;
  responseType: 'simple' | 'benefits' | 'error';
  confidence: number;
  timestamp: Date;
}

export class SimpleChatRouter {
  private benefitsData: any;

  constructor() {
    this.benefitsData = this.loadBenefitsData();
  }

  private loadBenefitsData() {
    // Load basic benefits data
    return {
      healthPlans: [
        { name: 'Basic Plan', cost: 100, coverage: 'Basic' },
        { name: 'Premium Plan', cost: 200, coverage: 'Comprehensive' }
      ],
      dentalPlans: [
        { name: 'Standard Dental', cost: 50, coverage: 'Basic' },
        { name: 'Premium Dental', cost: 100, coverage: 'Comprehensive' }
      ]
    };
  }

  async routeMessage(message: string, attachments?: any[]): Promise<ChatResponse> {
    try {
      const lowerMessage = message.toLowerCase();

      // Handle document attachments
      if (attachments && attachments.length > 0) {
        return this.handleDocumentAnalysis(message, attachments);
      }

      // Handle benefits questions
      if (this.isBenefitsQuestion(lowerMessage)) {
        return this.handleBenefitsQuestion(lowerMessage);
      }

      // Handle plan comparison
      if (this.isComparisonQuestion(lowerMessage)) {
        return this.handleComparisonQuestion(lowerMessage);
      }

      // Handle cost questions
      if (this.isCostQuestion(lowerMessage)) {
        return this.handleCostQuestion(lowerMessage);
      }

      // Default response
      return this.getDefaultResponse();

    } catch (error) {
      logger.error('Error in SimpleChatRouter', { error, message });
      return {
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        responseType: 'error',
        confidence: 0,
        timestamp: new Date()
      };
    }
  }

  private isBenefitsQuestion(message: string): boolean {
    const keywords = ['health', 'dental', 'vision', 'insurance', 'benefits', 'coverage'];
    return keywords.some(keyword => message.includes(keyword));
  }

  private isComparisonQuestion(message: string): boolean {
    const keywords = ['compare', 'difference', 'vs', 'versus', 'better', 'which'];
    return keywords.some(keyword => message.includes(keyword));
  }

  private isCostQuestion(message: string): boolean {
    const keywords = ['cost', 'price', 'expensive', 'cheap', 'afford', 'budget'];
    return keywords.some(keyword => message.includes(keyword));
  }

  private handleBenefitsQuestion(message: string): ChatResponse {
    let response = "Here's information about our benefits plans:\n\n";
    
    response += "**Health Insurance Plans:**\n";
    this.benefitsData.healthPlans.forEach((plan: any) => {
      response += `• ${plan.name}: $${plan.cost}/month - ${plan.coverage} coverage\n`;
    });

    response += "\n**Dental Plans:**\n";
    this.benefitsData.dentalPlans.forEach((plan: any) => {
      response += `• ${plan.name}: $${plan.cost}/month - ${plan.coverage} coverage\n`;
    });

    response += "\nWould you like me to compare specific plans or help you calculate costs?";

    return {
      content: response,
      responseType: 'benefits',
      confidence: 0.9,
      timestamp: new Date()
    };
  }

  private handleComparisonQuestion(message: string): ChatResponse {
    const response = `**Plan Comparison:**

**Basic vs Premium Health:**
• Basic Plan: $100/month - Basic coverage
• Premium Plan: $200/month - Comprehensive coverage

**Key Differences:**
• Premium includes dental and vision
• Premium has lower deductibles
• Premium covers more specialists

Would you like more detailed information about any specific plan?`;

    return {
      content: response,
      responseType: 'benefits',
      confidence: 0.8,
      timestamp: new Date()
    };
  }

  private handleCostQuestion(message: string): ChatResponse {
    const response = `**Cost Calculator:**

**Monthly Premiums:**
• Basic Health: $100
• Premium Health: $200
• Standard Dental: $50
• Premium Dental: $100

**Total Monthly Costs:**
• Basic Package: $150 (Basic Health + Standard Dental)
• Premium Package: $300 (Premium Health + Premium Dental)

**Annual Savings with Basic:** $1,800
**Annual Cost with Premium:** $3,600

Would you like me to calculate costs for your specific situation?`;

    return {
      content: response,
      responseType: 'benefits',
      confidence: 0.9,
      timestamp: new Date()
    };
  }

  private async handleDocumentAnalysis(message: string, attachments: any[]): Promise<ChatResponse> {
    try {
      // Search for relevant documents
      const searchResults = await simpleRAGSystem.searchDocuments(message);
      
      let response = `📄 **Document Analysis Complete**

I've received your document(s). Here's what I found:

**Document Summary:**
• ${attachments.length} file(s) uploaded
• Document type: Benefits information
• Key topics: Health insurance, coverage details`;

      if (searchResults.length > 0) {
        response += `\n\n**Relevant Information Found:**
${searchResults.slice(0, 3).map((result, index) => 
  `${index + 1}. **${result.document.title}** (${(result.score * 100).toFixed(0)}% match)
   ${result.matchedText.substring(0, 150)}...`
).join('\n\n')}`;
      }

      response += `\n\n**Next Steps:**
• I can help you understand specific sections
• Compare this with other plans
• Calculate costs based on this information

What would you like to know about your benefits document?`;

      return {
        content: response,
        responseType: 'benefits',
        confidence: 0.7,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error in document analysis', { error, message });
      return this.getDefaultResponse();
    }
  }

  private getDefaultResponse(): ChatResponse {
    const response = `Hello! I'm your Benefits Assistant. I can help you with:

• **Plan Information** - Learn about health, dental, and vision plans
• **Cost Calculations** - Calculate monthly and annual costs
• **Plan Comparisons** - Compare different benefit options
• **Document Analysis** - Upload and analyze benefit documents

What would you like to know about your benefits?`;

    return {
      content: response,
      responseType: 'simple',
      confidence: 0.8,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
export const simpleChatRouter = new SimpleChatRouter();
