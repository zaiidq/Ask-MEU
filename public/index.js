// Basic version without feedback or recent questions
export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setLoading(true);
    try {
      
      const mockResponses = {
        "visa": "Visit International Office in Building A, Room 102",
        "tuition": "Payments accepted at Finance Office in Building B",
        "cafe": "Central Café open until 10pm daily"
      };
      
      const lowerQ = question.toLowerCase();
      const response = 
        lowerQ.includes('visa') ? mockResponses.visa :
        lowerQ.includes('tuition') ? mockResponses.tuition :
        lowerQ.includes('cafe') ? mockResponses.cafe :
        "Sorry, I don't have an answer for that question.";
      
      setAnswer(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Basic UI structure with input and response display
  );
}