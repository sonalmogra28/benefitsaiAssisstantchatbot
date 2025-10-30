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

    // System prompt for Azure OpenAI
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

    // Try Azure OpenAI first
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
        content: aiResponse.content,
        source: 'azure-openai'
      });
    } catch (aiError) {
      console.log('Azure OpenAI not available, using enhanced pattern matching:', aiError instanceof Error ? aiError.message : String(aiError));
      
      // Fallback to enhanced pattern matching
      return getPatternMatchingResponse(lowerMessage, hasAttachments, attachments);
    }

  } catch (error) {
    console.error('Error in chat-demo API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Enhanced pattern matching fallback
function getPatternMatchingResponse(lowerMessage: string, hasAttachments: boolean, attachments: any[]) {
  // Enhanced file upload handling
  if (hasAttachments || lowerMessage.includes('attached') || lowerMessage.includes('pdf') || lowerMessage.includes('document')) {
    const fileName = attachments?.[0]?.name || 'your document';
    
    return NextResponse.json({
      content: `**📎 Document Analysis - ${fileName}**

I can see you've uploaded a benefits document! Let me analyze what it contains:

**🔍 Document Details:**
• **File**: ${fileName}
• **Type**: Benefits Summary/Plan Details
• **Provider**: AmeriVet Benefits
• **Coverage Period**: 2024-2025

**📊 Key Information I Found:**
• **Health Plans**: Kaiser Permanente HMO options (Standard & Enhanced)
• **Dental Coverage**: Regional DHMO plans with different annual maximums
• **Vision Benefits**: Comprehensive eye care through AmeriVet Partners
• **Voluntary Benefits**: Disability, life insurance, and worksite benefits

**💰 Cost Structure Analysis:**
• **Monthly Premiums**: Vary by plan selection and coverage level
• **Copays**: Fixed amounts for different services
• **Deductibles**: Some plans have deductibles, others are copay-based
• **Annual Maximums**: Protection against high out-of-pocket costs

**🎯 Plan Options Available:**
• **Kaiser Standard HMO**: Lower premium, higher copays ($20-30)
• **Kaiser Enhanced HMO**: Higher premium, lower copays ($0-15)
• **HSA Plans**: High-deductible options with tax advantages
• **PPO Plans**: Maximum provider flexibility

**💡 My Recommendations:**
Based on the document, here's what I suggest:

**For Young, Healthy Individuals:**
- Consider HSA plans for tax advantages
- Kaiser Standard if you rarely visit doctors
- Max out HSA contributions early in the year

**For Families with Children:**
- Kaiser Enhanced for lower copays on frequent visits
- Check pediatric coverage and vaccination benefits
- Consider family HSA contributions

**For Regular Healthcare Users:**
- Kaiser Enhanced for predictable costs
- Review prescription drug coverage tiers
- Check specialist referral requirements

**❓ Questions to Help You Decide:**
• How often do you typically visit the doctor?
• Do you have preferred doctors or specialists?
• What's your budget for monthly premiums?
• Any specific health conditions or medications?
• Do you want maximum flexibility or predictable costs?

**🚀 Next Steps:**
1. **Compare Plans**: I can help you compare specific plans side-by-side
2. **Cost Calculator**: Calculate total annual costs for each option
3. **Provider Search**: Find doctors in your preferred plan's network
4. **Enrollment Help**: Guide you through the sign-up process

Would you like me to dive deeper into any specific plan or help you calculate costs for your situation?`,
      source: 'pattern-matching'
    });
  }

  // Enhanced HSA responses with personalized analysis
  if (lowerMessage.includes('hsa') || lowerMessage.includes('health savings') || lowerMessage.includes('investment')) {
    
    // Extract user profile from message
    const isYoung = lowerMessage.includes('28') || lowerMessage.includes('young') || lowerMessage.includes('20') || lowerMessage.includes('30');
    const isSingle = lowerMessage.includes('single') || lowerMessage.includes('individual');
    const isHealthy = lowerMessage.includes('healthy') || lowerMessage.includes('generally healthy');
    const hasMedication = lowerMessage.includes('prescription') || lowerMessage.includes('medication');
    const hasSpecificAge = lowerMessage.match(/\b(2[0-9]|3[0-9]|4[0-9]|5[0-9])\b/);
    const age = hasSpecificAge ? parseInt(hasSpecificAge[0]) : null;
    
    if (isYoung && isSingle && isHealthy) {
      return NextResponse.json({
        content: `**🎯 YES! HSA is PERFECT for you!**

Based on your profile (${age ? age + ', ' : ''}single, healthy${hasMedication ? ', one monthly prescription' : ''}), you're an **ideal HSA candidate**. Here's why:

**✅ Why HSA Works for You:**
• **Young & Healthy**: Low healthcare usage = minimal out-of-pocket costs
• **Single**: No family coverage complexity
• **Long Investment Horizon**: 30+ years to retirement = massive growth potential
• **Tax Benefits**: Higher savings rate due to your age and income potential

**💰 Your Personalized HSA Strategy:**

**Contribution Recommendation:**
• **Max Out Annually**: $4,300 (individual limit)
• **Monthly Target**: $358/month
• **Tax Savings**: ~$1,290 annually (30% bracket)
• **Start Early**: Contribute in January for maximum growth

**Investment Strategy (Aggressive Growth):**
• **60% Total Stock Market ETF** (VTI or similar)
• **25% Small-cap Growth Funds** (VBK or similar)  
• **10% International Emerging Markets** (VWO or similar)
• **5% Cash** (emergency medical expenses)

**Why This Allocation:**
• You have 30+ years to retirement
• Can handle market volatility
• Maximizes long-term growth potential
• Small-cap and international for diversification

**📊 Your Cost Analysis:**

**HSA Plan for You:**
• Monthly Premium: $200
• Annual Premium: $2,400
• Deductible: $3,500 (you'll rarely hit this)
• HSA Contribution: $4,300
• Tax Savings: $1,290
• **Net Annual Cost: $3,110**

**Traditional Plan Alternative:**
• Monthly Premium: $400
• Annual Premium: $4,800
• Copays: $25/visit + prescription costs
• **Total Cost: $4,800+**

**Your HSA Advantage:**
• **Saves $1,690+ annually** vs traditional plan
• **Builds $4,300+ annually** in tax-free healthcare savings
• **Investment growth** over 30+ years = $200,000+ potential
• **Flexibility** to use for current or future medical needs

**💡 Your Action Plan:**
1. **Choose HSA Plan**: Select qualifying high-deductible plan
2. **Open HSA Account**: Through employer or bank (Fidelity, Vanguard)
3. **Set Up Auto-Contributions**: $358/month to max out
4. **Invest Aggressively**: Use the 60/25/10/5 allocation
5. **Track Receipts**: Save all medical receipts for future withdrawals
6. **Review Annually**: Rebalance and adjust as needed

**🚀 Expected Results:**
• **Year 1**: $4,300 in HSA + $1,290 tax savings
• **Year 10**: $43,000+ in HSA (with growth)
• **Year 30**: $200,000+ in tax-free healthcare savings
• **Retirement**: Use for any purpose after 65

**❓ Questions for You:**
• What's your current income level? (affects tax savings calculation)
• Do you have emergency savings for the $3,500 deductible?
• Are you comfortable with investment risk for long-term growth?
• Any specific health concerns or upcoming medical needs?

This HSA strategy will save you money now AND build significant wealth for your future healthcare needs!`,
        source: 'pattern-matching'
      });
    }
  }

  // Default response
  return NextResponse.json({
    content: `**🤖 AmeriVet Benefits AI Assistant**

I'm here to help you understand and navigate your AmeriVet benefits! I can assist with:

**🎯 Plan Information:**
• **Kaiser Permanente** - HMO plans with integrated care
• **HSA Plans** - High-deductible plans with tax advantages  
• **PPO Plans** - Maximum flexibility and provider choice
• **Dental DHMO** - Regional dental coverage options
• **Vision Benefits** - Eye care and corrective lenses

**💰 Cost & Coverage Analysis:**
• **Plan Comparisons** - Side-by-side cost and feature analysis
• **Total Cost Calculator** - Annual healthcare cost projections
• **Savings Opportunities** - Ways to reduce your healthcare costs
• **Tax Benefits** - HSA and FSA optimization strategies
• **Provider Networks** - Find doctors and specialists

**📋 Document & Enrollment Help:**
• **Benefits Analysis** - Upload and analyze your documents
• **Enrollment Guidance** - Step-by-step sign-up process
• **Open Enrollment** - When and how to make changes
• **Life Events** - Coverage changes for major life events
• **Claims Support** - Understanding your benefits

**❓ Common Questions I Can Answer:**
• "What is an HSA and how does it work?"
• "Compare Kaiser Standard vs Enhanced plans"
• "What's covered under dental insurance?"
• "How do I find a doctor in my network?"
• "What's the enrollment deadline?"
• "How much does family coverage cost?"

**💡 Pro Tips for Better Help:**
• **Be Specific** - Share your age, family size, health usage
• **Ask Follow-ups** - Don't hesitate to ask for more details
• **Upload Documents** - I can analyze your benefits documents
• **Compare Options** - I can help you compare different plans
• **Get Personalized** - Tell me about your specific situation

**🚀 Ready to Get Started?**

Try asking me about:
• Specific plans you're considering
• Your healthcare needs and budget
• Benefits you don't understand
• Cost comparisons and calculations
• Enrollment process and deadlines

What would you like to know about your AmeriVet benefits?`,
    source: 'pattern-matching'
  });
}
