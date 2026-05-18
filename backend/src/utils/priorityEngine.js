const calculatePriority = (data) => {
  const { description, peopleCount, requestType, urgency } = data;
  
  const criticalKeywords = ['trapped', 'severe', 'medical emergency', 'bleeding', 'dying', 'fire', 'rising water', 'no air', 'choking'];
  const highKeywords = ['no food', 'no water', 'pregnant', 'infant', 'elderly', 'sick', 'injury', 'shelter destroyed', 'flooded'];
  
  const descLower = description.toLowerCase();
  
  // Check critical keywords
  if (criticalKeywords.some(keyword => descLower.includes(keyword))) {
    return 'CRITICAL';
  }
  
  // High people count (e.g. > 5) in a disaster is high priority
  if (peopleCount > 5) {
    return 'HIGH';
  }
  
  // Check high keywords
  if (highKeywords.some(keyword => descLower.includes(keyword))) {
    return 'HIGH';
  }
  
  // Urgency mapping if provided by user
  if (urgency === 'immediate') return 'CRITICAL';
  if (urgency === 'urgent') return 'HIGH';
  
  // Default logic based on request type
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

module.exports = { calculatePriority };
