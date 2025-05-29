import kb from '../../public/data/kb.json';

export default function handler(req, res) {
  const { q } = req.query;
  
  if (!q) return res.status(400).json({ error: 'No query provided' });

  const query = q.toLowerCase();
  const match = kb.qa_pairs.find(item => 
    item.question.toLowerCase().includes(query) || 
    item.answer.toLowerCase().includes(query)
  );

  res.status(200).json({ 
    answer: match?.answer || "Sorry, no answer found",
    category: match?.category
  });
}