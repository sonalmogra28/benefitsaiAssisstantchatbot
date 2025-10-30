import { NextRequest, NextResponse } from 'next/server';
import { hybridLLMRouter } from '@/lib/services/hybrid-llm-router';

export async function POST(req: NextRequest) {
  try {
    const { message, attachments } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const lowerMessage = message.toLowerCase();
    const hasAttachments = attachments && attachments.length > 0;

    // Create a benefits-focused system prompt
    const systemPrompt = `You are an expert AmeriVet Benefits AI Assistant. You help employees understand their benefits, compare plans, and make informed decisions.

**Your Knowledge Base:**
- Kaiser Permanente HMO plans (Standard & Enhanced for Washington & Oregon)
- HSA plans (Standard $3,500 deductible & Enhanced $2,000 deductible)
- PPO plans with provider flexibility
- Regional DHMO dental plans (Northern CA $500/$2K, Southern CA $2K)
- Vision benefits through AmeriVet Partners Management
- Voluntary benefits (Unum disability, life insurance, worksite benefits)
- Open enrollment process and deadlines

**Your Capabilities:**
- Analyze benefits documents and PDFs
- Compare plan costs and coverage
- Explain complex benefits concepts simply
- Provide personalized recommendations
- Answer enrollment questions
- Help with provider networks and coverage

**Your Style:**
- Be conversational and helpful, not robotic
- Use specific examples and numbers when relevant
- Ask follow-up questions to better understand needs
- Provide actionable next steps
- Be empathetic about healthcare decisions

**Document Analysis:**
When users attach documents or ask about specific PDFs, analyze the content and provide specific insights about:
- Plan details and coverage
- Cost structures and savings opportunities
- Network information
- Key benefits and limitations
- Recommendations based on their situation

Always be helpful, accurate, and focused on helping them make the best benefits decisions.`;

    // Use Azure OpenAI for intelligent responses
    try {
      const aiResponse = await hybridLLMRouter.routeRequest({
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: hasAttachments 
              ? `I've attached a benefits document. Please analyze it and tell me what it contains: ${message}`
              : message
          }
        ],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      });

      return NextResponse.json({
        content: aiResponse.content
      });
    } catch (aiError) {
      console.error('Azure OpenAI error:', aiError);
      
      // Fallback to pattern matching if Azure OpenAI fails
      return NextResponse.json({
        content: `I'm having trouble connecting to the AI service right now. Let me help you with a quick response:

**🤖 Quick Benefits Help**

I can help you with:
• **Plan comparisons** - Kaiser, HSA, PPO options
• **Cost analysis** - Premiums, deductibles, copays
• **Coverage details** - What's included in each plan
• **Enrollment process** - How to sign up
• **Document analysis** - Understanding your benefits documents

**Common Questions:**
• "What is an HSA?" - Tax-advantaged health savings
• "Compare Kaiser plans" - Standard vs Enhanced HMO
• "Dental coverage" - Regional DHMO options
• "Family benefits" - Coverage for spouse and children

Please try your question again, and I'll do my best to help!`
      });
    }

  } catch (error) {
    console.error('Error in chat-demo API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
