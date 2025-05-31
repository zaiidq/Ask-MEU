// app.js (Static version)
let knowledgeBase = [];
let totalQuestions = 0;
let helpfulResponses = 0;
let currentQuestionId = null;
let stats = { topCategories: [] };

async function init() {
    await loadKnowledgeBase();
    loadStats();
    loadQAList();
}

async function loadKnowledgeBase() {
    try {
        const res = await fetch('kb.json');
        knowledgeBase = await res.json();
    } catch (error) {
        console.error('Error loading knowledge base:', error);
        // Fallback data if kb.json fails to load
        knowledgeBase = [
            {
                id: 1,
                question: "What are the library hours?",
                answer: "The library is open Monday-Friday 8AM-10PM, Saturday 9AM-6PM, and Sunday 12PM-8PM.",
                category: "facilities",
                helpful: 0,
                notHelpful: 0
            },
            {
                id: 2,
                question: "How do I register for courses?",
                answer: "You can register for courses through the student portal during the registration period. Contact the registrar's office for assistance.",
                category: "academic",
                helpful: 0,
                notHelpful: 0
            }
        ];
    }
}

function loadStats() {
    // Load stats from localStorage
    const savedStats = localStorage.getItem('meu-stats');
    if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        totalQuestions = parsedStats.totalQuestions || 0;
        helpfulResponses = parsedStats.helpfulResponses || 0;
        stats.topCategories = parsedStats.topCategories || [];
    }
    updateStats();
}

function saveStats() {
    // Save stats to localStorage
    const statsToSave = {
        totalQuestions,
        helpfulResponses,
        topCategories: stats.topCategories
    };
    localStorage.setItem('meu-stats', JSON.stringify(statsToSave));
}

function searchAnswer() {
    const question = document.getElementById('questionInput').value.trim().toLowerCase();
    if (!question) return;

    totalQuestions++;
    const answer = findAnswer(question);

    if (answer) {
        displayAnswer(answer);
        currentQuestionId = answer.id;
        // Update category stats
        updateCategoryStats(answer.category);
    } else {
        displayAnswer({
            question,
            answer: "I'm sorry, I couldn't find a specific answer to your question. Please try rephrasing your question or contact the Student Affairs office for personalized assistance.",
            category: "general"
        });
        currentQuestionId = null;
    }

    updateStats();
    saveStats();
    document.getElementById('questionInput').value = '';
}

function findAnswer(question) {
    let bestMatch = null;
    let maxScore = 0;
    
    for (let qa of knowledgeBase) {
        let score = 0;
        const qaText = (qa.question + ' ' + qa.answer).toLowerCase();
        
        // Exact question match gets highest score
        if (qa.question.toLowerCase().includes(question)) score += 10;
        
        // Word matching
        for (let word of question.split(' ')) {
            if (word.length > 2 && qaText.includes(word)) score += 2;
        }
        
        if (score > maxScore) {
            maxScore = score;
            bestMatch = qa;
        }
    }
    
    return maxScore > 0 ? bestMatch : null;
}

function displayAnswer(answer) {
    document.getElementById('answerText').textContent = answer.answer;
    document.getElementById('answerCard').style.display = 'block';
    document.getElementById('answerCard').scrollIntoView({ behavior: 'smooth' });
}

function giveFeedback(isHelpful) {
    if (currentQuestionId) {
        // Find and update the Q&A item
        const qaItem = knowledgeBase.find(qa => qa.id === currentQuestionId);
        if (qaItem) {
            if (isHelpful) {
                qaItem.helpful = (qaItem.helpful || 0) + 1;
                helpfulResponses++;
            } else {
                qaItem.notHelpful = (qaItem.notHelpful || 0) + 1;
            }
        }
    }
    
    if (isHelpful) helpfulResponses++;
    
    // Update button states
    document.querySelectorAll('.feedback-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    updateStats();
    saveStats();
    loadQAList(); // Refresh the admin list to show updated counts
}

function updateCategoryStats(category) {
    const existingCategory = stats.topCategories.find(cat => cat.category === category);
    if (existingCategory) {
        existingCategory.count++;
    } else {
        stats.topCategories.push({ category, count: 1 });
    }
    
    // Sort by count and keep top 5
    stats.topCategories.sort((a, b) => b.count - a.count);
    stats.topCategories = stats.topCategories.slice(0, 5);
}

function updateStats() {
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('helpfulCount').textContent = helpfulResponses;
    
    const topCategoriesDiv = document.getElementById('topCategories');
    topCategoriesDiv.innerHTML = stats.topCategories.map(cat => `
        <span class="category-badge">${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} (${cat.count})</span>`
    ).join('');
}

function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    panel.style.display = panel.style.display === 'none' || !panel.style.display ? 'block' : 'none';
}

function addQA() {
    const question = document.getElementById('newQuestion').value.trim();
    const answer = document.getElementById('newAnswer').value.trim();
    const category = document.getElementById('newCategory').value;
    
    if (!question || !answer) {
        alert('Please fill in both question and answer fields.');
        return;
    }

    // Generate new ID
    const newId = Math.max(...knowledgeBase.map(qa => qa.id), 0) + 1;
    
    // Add new Q&A to knowledge base
    const newQA = {
        id: newId,
        question,
        answer,
        category,
        helpful: 0,
        notHelpful: 0
    };
    
    knowledgeBase.push(newQA);
    
    // Update display
    loadQAList();
    alert('Q&A pair added successfully!');
    
    // Clear form
    document.getElementById('newQuestion').value = '';
    document.getElementById('newAnswer').value = '';
    document.getElementById('newCategory').value = 'general';
    
    // Save to localStorage
    localStorage.setItem('meu-knowledge-base', JSON.stringify(knowledgeBase));
}

function loadQAList() {
    const qaList = document.getElementById('qaList');
    qaList.innerHTML = knowledgeBase.map(qa => `
        <div class="qa-item">
            <h6>Q: ${qa.question}</h6>
            <p><strong>A:</strong> ${qa.answer}</p>
            <div class="d-flex justify-content-between align-items-center">
                <span class="category-badge">${qa.category}</span>
                <div>
                    <small class="text-muted">👍 ${qa.helpful || 0} | 👎 ${qa.notHelpful || 0}</small>
                    <button class="btn btn-sm btn-danger ms-2" onclick="deleteQA(${qa.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteQA(id) {
    if (!confirm('Are you sure you want to delete this Q&A pair?')) return;
    
    knowledgeBase = knowledgeBase.filter(qa => qa.id !== id);
    loadQAList();
    
    // Save to localStorage
    localStorage.setItem('meu-knowledge-base', JSON.stringify(knowledgeBase));
}

// Load saved knowledge base from localStorage on init
function loadSavedKnowledgeBase() {
    const saved = localStorage.getItem('meu-knowledge-base');
    if (saved) {
        const savedKB = JSON.parse(saved);
        // Merge with original kb.json data
        knowledgeBase = [...knowledgeBase, ...savedKB.filter(saved => 
            !knowledgeBase.some(original => original.id === saved.id)
        )];
    }
}

// Enhanced init function
async function enhancedInit() {
    await loadKnowledgeBase();
    loadSavedKnowledgeBase();
    loadStats();
    loadQAList();
}

// Event listeners
document.getElementById('questionInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchAnswer();
});

// Initialize when page loads
enhancedInit();