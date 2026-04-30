// Configuration
// Détecte automatiquement le chemin de base (fonctionne avec /pollmind/ ou en direct)
const BASE_PATH = window.location.pathname.split('/')[1] === 'pollmind' ? '/pollmind' : '';
const API_URL = `${BASE_PATH}/api`;
let currentUser = null;
let authToken = null;

// ========== AUTHENTIFICATION ==========

function showLogin() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

async function register() {
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-password-confirm').value;

  if (!username || !password) {
    alert('Veuillez remplir tous les champs');
    return;
  }

  if (password !== confirmPassword) {
    alert('Les mots de passe ne correspondent pas');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      showLogin();
      document.getElementById('register-username').value = '';
      document.getElementById('register-password').value = '';
      document.getElementById('register-password-confirm').value = '';
    } else {
      alert(data.error || 'Erreur lors de l\'inscription');
    }
  } catch (error) {
    alert('Erreur de connexion au serveur');
    console.error(error);
  }
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    alert('Veuillez remplir tous les champs');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showMainSection();
    } else {
      alert(data.error || 'Identifiants incorrects');
    }
  } catch (error) {
    alert('Erreur de connexion au serveur');
    console.error(error);
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  document.getElementById('auth-section').style.display = 'flex';
  document.getElementById('main-section').style.display = 'none';
}

function showMainSection() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('main-section').style.display = 'block';
  
  document.getElementById('user-name').textContent = currentUser.username;
  document.getElementById('user-points').textContent = `${currentUser.points.toFixed(2)} points`;

  if (currentUser.is_admin) {
    document.getElementById('nav-admin').style.display = 'block';
  }

  loadQuestions();
}

// ========== NAVIGATION ==========

function showTab(tabName) {
  // Cacher tous les onglets
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Afficher l'onglet sélectionné
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`nav-${tabName}`).classList.add('active');

  // Charger les données correspondantes
  if (tabName === 'questions') {
    loadQuestions();
  } else if (tabName === 'my-bets') {
    loadMyBets();
  } else if (tabName === 'leaderboard') {
    loadLeaderboard();
  } else if (tabName === 'admin') {
    loadAdminData();
  }
}

// ========== QUESTIONS ==========

async function loadQuestions() {
  try {
    const response = await fetch(`${API_URL}/questions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const questions = await response.json();

    const container = document.getElementById('questions-list');
    
    if (questions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">Aucune question disponible pour le moment</div>
        </div>
      `;
      return;
    }

    container.innerHTML = questions
      .filter(q => q.status === 'open')
      .map(question => `
        <div class="question-card">
          <div class="question-header">
            <div class="question-title">
              ${question.title}
              <span class="status-badge status-${question.status}">${question.status === 'open' ? 'Ouvert' : 'Résolu'}</span>
            </div>
            <div class="question-meta">Par ${question.creator_name} • ${formatDate(question.created_at)}</div>
          </div>
          ${question.description ? `<div class="question-description">${question.description}</div>` : ''}
          <div class="options-grid">
            ${question.options.map(option => {
              const price = calculatePrice(option.total_shares);
              return `
                <div class="option-item ${option.is_correct ? 'option-correct' : ''}">
                  <div class="option-info">
                    <div class="option-text">${option.text}</div>
                    <div class="option-stats">${option.bet_count} paris • ${option.total_shares.toFixed(2)} shares</div>
                  </div>
                  <div class="option-price">${(price * 100).toFixed(0)}%</div>
                  ${question.status === 'open' ? `
                    <button class="btn-bet" onclick="openBetModal(${question.id}, ${option.id}, '${option.text}', '${question.title}')">
                      Parier
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('');

    // Rafraîchir le profil pour avoir les points à jour
    await refreshProfile();
  } catch (error) {
    console.error('Erreur chargement questions:', error);
  }
}

function calculatePrice(totalShares) {
  const basePrice = 0.5;
  const priceImpact = totalShares * 0.01;
  return Math.min(0.95, Math.max(0.05, basePrice + priceImpact));
}

// ========== PARIS ==========

let currentBet = null;

function openBetModal(questionId, optionId, optionText, questionTitle) {
  currentBet = { questionId, optionId, optionText, questionTitle };
  
  const modal = document.getElementById('bet-modal');
  const content = document.getElementById('bet-modal-content');
  
  content.innerHTML = `
    <p><strong>Question:</strong> ${questionTitle}</p>
    <p><strong>Votre choix:</strong> ${optionText}</p>
    <p><strong>Points disponibles:</strong> ${currentUser.points.toFixed(2)}</p>
    
    <input type="number" id="bet-amount" class="bet-amount-input" placeholder="Montant à parier" min="0.1" step="0.1" />
    
    <div class="bet-info" id="bet-calculation"></div>
    
    <button class="btn-primary" onclick="placeBet()">Confirmer le pari</button>
  `;
  
  modal.style.display = 'block';
  
  // Ajouter un événement pour calculer en temps réel
  document.getElementById('bet-amount').addEventListener('input', calculateBetPreview);
}

function closeBetModal() {
  document.getElementById('bet-modal').style.display = 'none';
  currentBet = null;
}

async function calculateBetPreview() {
  const amount = parseFloat(document.getElementById('bet-amount').value);
  const calcDiv = document.getElementById('bet-calculation');
  
  if (!amount || amount <= 0) {
    calcDiv.innerHTML = '';
    return;
  }
  
  if (amount > currentUser.points) {
    calcDiv.innerHTML = '<p style="color: var(--danger-color)">⚠️ Points insuffisants</p>';
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/questions/${currentBet.questionId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const question = await response.json();
    const option = question.options.find(o => o.id === currentBet.optionId);
    
    // Récupérer les stats actuelles
    const statsResponse = await fetch(`${API_URL}/questions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const allQuestions = await statsResponse.json();
    const currentQuestion = allQuestions.find(q => q.id === currentBet.questionId);
    const currentOption = currentQuestion.options.find(o => o.id === currentBet.optionId);
    
    const price = calculatePrice(currentOption.total_shares);
    const shares = amount / price;
    
    calcDiv.innerHTML = `
      <p><strong>Prix actuel:</strong> ${(price * 100).toFixed(2)}%</p>
      <p><strong>Shares reçues:</strong> ${shares.toFixed(4)}</p>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">
        Si cette option gagne, vos gains dépendront du pool total et de votre part de shares.
      </p>
    `;
  } catch (error) {
    console.error('Erreur calcul:', error);
  }
}

async function placeBet() {
  const amount = parseFloat(document.getElementById('bet-amount').value);
  
  if (!amount || amount <= 0) {
    alert('Veuillez entrer un montant valide');
    return;
  }
  
  if (amount > currentUser.points) {
    alert('Points insuffisants');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/bets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        questionId: currentBet.questionId,
        optionId: currentBet.optionId,
        amount
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`Pari enregistré ! Vous avez reçu ${data.shares.toFixed(4)} shares au prix de ${(data.price * 100).toFixed(2)}%`);
      closeBetModal();
      await refreshProfile();
      loadQuestions();
    } else {
      alert(data.error || 'Erreur lors du pari');
    }
  } catch (error) {
    alert('Erreur de connexion au serveur');
    console.error(error);
  }
}

// ========== MES PARIS ==========

async function loadMyBets() {
  try {
    const response = await fetch(`${API_URL}/my-bets`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const bets = await response.json();

    const container = document.getElementById('my-bets-list');
    
    if (bets.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎲</div>
          <div class="empty-state-text">Vous n'avez pas encore placé de paris</div>
        </div>
      `;
      return;
    }

    container.innerHTML = bets.map(bet => {
      let statusClass = 'bet-status-pending';
      let statusText = 'En cours';
      
      if (bet.question_status === 'resolved') {
        // Vérifier si l'option pariée était la bonne
        // Cette information devrait être enrichie côté serveur
        statusClass = 'bet-status-lost';
        statusText = 'Perdu';
      }
      
      return `
        <div class="bet-item">
          <div class="bet-item-header">
            <div class="bet-question">${bet.question_title}</div>
            <div class="bet-amount">-${bet.amount.toFixed(2)} pts</div>
          </div>
          <div class="bet-details">
            <p><strong>Votre pari:</strong> ${bet.option_text}</p>
            <p><strong>Prix:</strong> ${(bet.price * 100).toFixed(2)}% • <strong>Shares:</strong> ${bet.shares.toFixed(4)}</p>
            <p><strong>Date:</strong> ${formatDate(bet.created_at)}</p>
            <span class="bet-status ${statusClass}">${statusText}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Erreur chargement paris:', error);
  }
}

// ========== CLASSEMENT ==========

async function loadLeaderboard() {
  try {
    const response = await fetch(`${API_URL}/leaderboard`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const users = await response.json();

    const container = document.getElementById('leaderboard-list');
    
    if (users.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-text">Pas encore de classement</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="leaderboard-table">
        <table>
          <thead>
            <tr>
              <th>Rang</th>
              <th>Utilisateur</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((user, index) => `
              <tr>
                <td><span class="rank rank-${index + 1}">${index + 1}</span></td>
                <td>${user.username}${user.id === currentUser.id ? ' (Vous)' : ''}</td>
                <td><strong>${user.points.toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Erreur chargement classement:', error);
  }
}

// ========== ADMIN ==========

let optionCount = 2;

function addOption() {
  optionCount++;
  const container = document.getElementById('options-container');
  const input = document.createElement('input');
  input.type = 'text';
  input.id = `option-${optionCount}`;
  input.placeholder = `Option ${optionCount}`;
  input.className = 'option-input';
  container.appendChild(input);
}

async function createQuestion() {
  const title = document.getElementById('new-question-title').value;
  const description = document.getElementById('new-question-description').value;
  
  if (!title) {
    alert('Veuillez entrer un titre');
    return;
  }
  
  const options = [];
  for (let i = 1; i <= optionCount; i++) {
    const optionText = document.getElementById(`option-${i}`).value;
    if (optionText) {
      options.push({ text: optionText });
    }
  }
  
  if (options.length < 2) {
    alert('Veuillez entrer au moins 2 options');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title, description, options })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Question créée avec succès !');
      
      // Réinitialiser le formulaire
      document.getElementById('new-question-title').value = '';
      document.getElementById('new-question-description').value = '';
      for (let i = 1; i <= optionCount; i++) {
        const input = document.getElementById(`option-${i}`);
        if (input) input.value = '';
      }
      
      loadAdminData();
    } else {
      alert(data.error || 'Erreur création question');
    }
  } catch (error) {
    alert('Erreur de connexion au serveur');
    console.error(error);
  }
}

async function loadAdminData() {
  try {
    const response = await fetch(`${API_URL}/questions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const questions = await response.json();
    const openQuestions = questions.filter(q => q.status === 'open');

    const container = document.getElementById('questions-to-resolve');
    
    if (openQuestions.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary);">Aucune question à résoudre</p>';
      return;
    }

    container.innerHTML = openQuestions.map(question => `
      <div class="question-card">
        <div class="question-title">${question.title}</div>
        <div class="options-grid">
          ${question.options.map(option => `
            <div class="option-item">
              <div class="option-info">
                <div class="option-text">${option.text}</div>
                <div class="option-stats">${option.bet_count} paris • ${option.total_shares.toFixed(2)} shares</div>
              </div>
              <button class="btn-resolve" onclick="resolveQuestion(${question.id}, ${option.id})">
                Marquer comme correct
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erreur chargement admin:', error);
  }
}

async function resolveQuestion(questionId, optionId) {
  if (!confirm('Êtes-vous sûr de vouloir résoudre cette question ? Cette action est irréversible.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/questions/${questionId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ optionId })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Question résolue ! Les gains ont été distribués.');
      loadAdminData();
      loadQuestions();
    } else {
      alert(data.error || 'Erreur résolution question');
    }
  } catch (error) {
    alert('Erreur de connexion au serveur');
    console.error(error);
  }
}

// ========== UTILS ==========

async function refreshProfile() {
  try {
    const response = await fetch(`${API_URL}/profile`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.ok) {
      const profile = await response.json();
      currentUser.points = profile.points;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      document.getElementById('user-points').textContent = `${currentUser.points.toFixed(2)} points`;
    }
  } catch (error) {
    console.error('Erreur refresh profil:', error);
  }
}

// Réclamer le bonus journalier
async function claimDailyBonus() {
  try {
    const response = await fetch(`${API_URL}/daily-bonus`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      if (data.alreadyClaimed) {
        alert(`⏰ ${data.message}\n${data.nextBonus}`);
      } else {
        alert(`🎁 ${data.message}\n+${data.bonus} points!`);
        await refreshProfile(); // Rafraîchir pour montrer les nouveaux points
      }
    } else {
      alert('Erreur: ' + (data.error || 'Impossible de réclamer le bonus'));
    }
  } catch (error) {
    console.error('Erreur lors de la réclamation du bonus:', error);
    alert('Erreur lors de la réclamation du bonus');
  }
}


function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  
  return date.toLocaleDateString('fr-FR');
}

// ========== INITIALISATION ==========

window.onclick = function(event) {
  const modal = document.getElementById('bet-modal');
  if (event.target === modal) {
    closeBetModal();
  }
};

// Vérifier si l'utilisateur est déjà connecté
window.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedToken && savedUser) {
    authToken = savedToken;
    currentUser = JSON.parse(savedUser);
    showMainSection();
  }
});
