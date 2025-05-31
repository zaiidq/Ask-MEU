// app.js (API-integrated version)
let knowledgeBase = [];
let totalQuestions = 0;
let helpfulResponses = 0;
let currentQuestionId = null;

async function init() {
    await loadKnowledgeBase();
    await loadStats();
    loadQAList();
}

async function loadKnowledgeBase() {
    const res = await fetch('/api/kb');
    knowledgeBase = await res.json();
}

async function loadStats() {
    const res = await fetch('/api/stats');
    const stats = await res.json();
    totalQuestions = stats.totalQuestions;
    helpfulResponses = stats.helpfulResponses;
    updateStats(stats.topCategories);
}

function searchAnswer() {
    const question = document.getElementById('questionInput').value.trim().toLowerCase();
    if (!question) return;

    totalQuestions++;
    const answer = findAnswer(question);

    if (answer) {
        displayAnswer(answer);
        currentQuestionId = answer.id;
    } else {
        displayAnswer({
            question,
            answer: "I'm sorry, I couldn't find a specific answer to your question. Please try rephrasing your question or contact the Student Affairs office for personalized assistance.",
            category: "general"
        });
        currentQuestionId = null;
    }

    updateStats();
    document.getElementById('questionInput').value = '';
}

function findAnswer(question) {
    let bestMatch = null;
    let maxScore = 0;
    for (let qa of knowledgeBase) {
        let score = 0;
        const qaText = (qa.question + ' ' + qa.answer).toLowerCase();
        if (qa.question.toLowerCase().includes(question)) score += 10;
        for (let word of question.split(' ')) {
            if (qaText.includes(word)) score += 2;
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

async function giveFeedback(isHelpful) {
    if (currentQuestionId) {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentQuestionId, helpful: isHelpful })
        });
    }
    if (isHelpful) helpfulResponses++;
    document.querySelectorAll('.feedback-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    await loadStats();
}

function updateStats(topCategories = []) {
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('helpfulCount').textContent = helpfulResponses;
    const topCategoriesDiv = document.getElementById('topCategories');
    topCategoriesDiv.innerHTML = topCategories.map(cat => `
        <span class="category-badge">${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} (${cat.count})</span>`
    ).join('');
}

function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    panel.style.display = panel.style.display === 'none' || !panel.style.display ? 'block' : 'none';
}

async function addQA() {
    const question = document.getElementById('newQuestion').value.trim();
    const answer = document.getElementById('newAnswer').value.trim();
    const category = document.getElementById('newCategory').value;
    if (!question || !answer) return alert('Please fill in both question and answer fields.');

    const res = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, category })
    });

    if (res.ok) {
        await loadKnowledgeBase();
        loadQAList();
        alert('Q&A pair added successfully!');
        document.getElementById('newQuestion').value = '';
        document.getElementById('newAnswer').value = '';
        document.getElementById('newCategory').value = 'general';
    }
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
                    <small class="text-muted">👍 ${qa.helpful} | 👎 ${qa.notHelpful}</small>
                    <button class="btn btn-sm btn-danger ms-2" onclick="deleteQA(${qa.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function deleteQA(id) {
    if (!confirm('Are you sure you want to delete this Q&A pair?')) return;
    const res = await fetch(`/api/kb/${id}`, { method: 'DELETE' });
    if (res.ok) {
        await loadKnowledgeBase();
        loadQAList();
    }
}

document.getElementById('questionInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchAnswer();
});

init();
