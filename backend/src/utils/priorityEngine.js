const { GoogleGenerativeAI } = require('@google/generative-ai');

const calculatePriority = async (data) => {
  const { description, peopleCount, requestType, urgency } = data;
  
  // Rule-based fallback function
  const getFallbackPriority = () => {
    const criticalKeywords = ['trapped', 'severe', 'medical emergency', 'bleeding', 'dying', 'fire', 'rising water', 'no air', 'choking'];
    const highKeywords = ['no food', 'no water', 'pregnant', 'infant', 'elderly', 'sick', 'injury', 'shelter destroyed', 'flooded'];
    
    const descLower = description.toLowerCase();
    if (criticalKeywords.some(keyword => descLower.includes(keyword))) return 'CRITICAL';
    if (peopleCount > 5) return 'HIGH';
    if (highKeywords.some(keyword => descLower.includes(keyword))) return 'HIGH';
    if (urgency === 'immediate') return 'CRITICAL';
    if (urgency === 'urgent') return 'HIGH';
    
    const typePriority = {
      'medical': 'HIGH',
      'rescue': 'CRITICAL',
      'food': 'MEDIUM',
      'water': 'MEDIUM',
      'shelter': 'MEDIUM',
      'other': 'LOW'
    };
    return typePriority[requestType] || 'MEDIUM';
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found. Using fallback priority engine.');
      return getFallbackPriority();
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an AI assistant for a disaster relief coordination platform. 
Your task is to analyze a distress signal and output ONLY the priority level: CRITICAL, HIGH, MEDIUM, or LOW.
CRITICAL INSTRUCTION: You MUST evaluate the actual description logically. Ignore the user's selected urgency if their description describes something trivial or non-life-threatening.
For example, if a user selects "Immediate/Critical" but the description is "I want pizza" or "My TV is broken", you MUST categorize it as LOW.

Priority Guidelines:
- CRITICAL: Imminent threat to life (e.g., trapped in collapsing building, severe arterial bleeding, drowning risk).
- HIGH: Serious but not immediately fatal (e.g., broken bones, vulnerable people like infants/elderly stranded without food for days).
- MEDIUM: Standard distress (e.g., need shelter, food/water running out but not empty, minor injuries).
- LOW: Non-urgent requests, trivial complaints, or absurd requests during a disaster (e.g., "I want pizza", "I need a phone charger", general info).

Request Details:
Type: ${requestType}
People Affected: ${peopleCount}
User-Selected Urgency: ${urgency}
Description: "${description}"

Respond with EXACTLY ONE WORD from this list: CRITICAL, HIGH, MEDIUM, LOW.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toUpperCase();

    if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(text)) {
      return text;
    } else {
      console.warn(`AI returned invalid priority: ${text}. Using fallback.`);
      return getFallbackPriority();
    }

  } catch (error) {
    console.error('Error in AI Priority Engine:', error);
    return getFallbackPriority();
  }
};

module.exports = { calculatePriority };
