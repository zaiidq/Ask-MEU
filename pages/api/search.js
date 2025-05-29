// Initial mock version
export default function handler(req, res) {
  const { q } = req.query;
  const mockResponses = {
    "visa": "Visit International Office in Building A, Room 102",
    "tuition": "Payments accepted at Finance Office in Building B",
    "cafe": "Central Café open until 10pm daily"
  };
  
  const lowerQ = q.toLowerCase();
  const response = 
    lowerQ.includes('visa') ? mockResponses.visa :
    lowerQ.includes('tuition') ? mockResponses.tuition :
    lowerQ.includes('cafe') ? mockResponses.cafe :
    "Sorry, I don't have an answer for that question.";
  
  res.status(200).json({ answer: response });
}