// Configuration
// Automatically detect the base path (works with /pollmind/ or direct hosting)
const pathParts = window.location.pathname.split('/').filter(p => p);
const BASE_PATH = pathParts[0] === 'pollmind' ? '/pollmind' : '';
const API_URL = `${BASE_PATH}/api`;
let currentUser = null;
let authToken = null;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const isDark = theme === 'dark';
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    themeToggle.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('pollmind-theme', nextTheme);
  applyTheme(nextTheme);
}

document.addEventListener('DOMContentLoaded', () => {
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(theme);
});

function logSumExp(values) {
  const maxValue = Math.max(...values);

  if (!Number.isFinite(maxValue)) {
    return maxValue;
  }

  const total = values.reduce((sum, value) => sum + Math.exp(value - maxValue), 0);
  return maxValue + Math.log(total);
}

function calculateLMSRCost(quantities, liquidity) {
  if (quantities.length === 0) {
    return 0;
  }

  const scaledQuantities = quantities.map(quantity => quantity / liquidity);
  return liquidity * logSumExp(scaledQuantities);
}

function calculateLMSRProbabilities(quantities, liquidity) {
  if (quantities.length === 0) {
    return [];
  }

  const scaledQuantities = quantities.map(quantity => quantity / liquidity);
  const denominator = logSumExp(scaledQuantities);
  return scaledQuantities.map(quantity => Math.exp(quantity - denominator));
}

function solveLMSRTradeForSpend(quantities, optionIndex, spend, liquidity) {
  const startingCost = calculateLMSRCost(quantities, liquidity);
  const currentProbabilities = calculateLMSRProbabilities(quantities, liquidity);
  let low = 0;
  let high = Math.max(
    spend / Math.max(currentProbabilities[optionIndex] || 0.000001, 0.000001) * 2,
    liquidity / 10,
    1
  );

  const tradeCostForQuantity = quantity => {
    const nextQuantities = quantities.slice();
    nextQuantities[optionIndex] += quantity;
    return calculateLMSRCost(nextQuantities, liquidity) - startingCost;
  };

  while (tradeCostForQuantity(high) < spend) {
    high *= 2;
  }

  for (let iteration = 0; iteration < 80; iteration++) {
    const mid = (low + high) / 2;
    const cost = tradeCostForQuantity(mid);

    if (cost < spend) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const quantity = (low + high) / 2;
  const nextQuantities = quantities.slice();
  nextQuantities[optionIndex] += quantity;

  return {
    quantity,
    probabilitiesBefore: currentProbabilities,
    probabilitiesAfter: calculateLMSRProbabilities(nextQuantities, liquidity)
  };
}

function formatProbability(probability) {
  return `${(probability * 100).toFixed(1)}%`;
}

// ========== AUTHENTICATION ==========

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
    alert('Please fill in all fields');
    return;
  }

  if (password !== confirmPassword) {
    alert('Passwords do not match');
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
      alert('Registration successful. You can now sign in.');
      showLogin();
      document.getElementById('register-username').value = '';
      document.getElementById('register-password').value = '';
      document.getElementById('register-password-confirm').value = '';
    } else {
      alert(data.error || 'Registration failed');
    }
  } catch (error) {
    alert('Unable to connect to the server');
    console.error(error);
  }
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    alert('Please fill in all fields');
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
      alert(data.error || 'Incorrect credentials');
    }
  } catch (error) {
    alert('Unable to connect to the server');
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
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show the selected tab
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`nav-${tabName}`).classList.add('active');

  // Load the matching data
  if (tabName === 'questions') {
    loadQuestions();
  } else if (tabName === 'resolved-questions') {
    loadResolvedQuestions();
  } else if (tabName === 'my-bets') {
    loadMyBets();
  } else if (tabName === 'leaderboard') {
    loadLeaderboard();
  } else if (tabName === 'admin') {
    loadAdminData();
  }
}

// ========== QUESTIONS ==========

function renderQuestionCard(question, options = {}) {
  const {
    allowBetting = false,
    showDeleteButton = false,
    deleteScope = 'resolved',
    showResolvedBadge = true,
    showCurrentUserPosition = false
  } = options;

  const userTotalStake = question.options.reduce(
    (sum, option) => sum + Number(option.user_amount || 0),
    0
  );

  return `
    <div class="question-card">
      <div class="question-header">
        <div class="question-title">
          ${question.title}
          ${showResolvedBadge ? `<span class="status-badge status-${question.status}">${question.status === 'open' ? 'Open' : 'Resolved'}</span>` : ''}
        </div>
        <div class="question-meta">By ${question.creator_name} • ${formatDate(question.created_at)}</div>
      </div>
      ${question.description ? `<div class="question-description">${question.description}</div>` : ''}
      ${showCurrentUserPosition && userTotalStake === 0 ? `
        <div class="question-description">You did not place a bet on this question.</div>
      ` : ''}
      <div class="options-grid">
        ${question.options.map(option => `
          <div class="option-item ${option.is_correct ? 'option-correct' : ''}">
            <div class="option-info">
              <div class="option-text">${option.text}</div>
              <div class="option-stats">${option.bet_count} bets • ${option.total_shares.toFixed(2)} shares outstanding</div>
              ${showCurrentUserPosition && Number(option.user_amount || 0) > 0 ? `
                <div class="option-stats">Your stake: ${Number(option.user_amount).toFixed(2)} points • Your shares: ${Number(option.user_shares || 0).toFixed(4)}</div>
              ` : ''}
            </div>
            <div class="option-price">${formatProbability(option.probability || 0)}</div>
            ${allowBetting ? `
              <button class="btn-bet" onclick="openBetModal(${question.id}, ${option.id}, '${option.text}', '${question.title}')">
                Bet
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ${showDeleteButton ? `
        <div class="question-admin-actions">
          <button class="btn-danger" onclick="deleteQuestion(${question.id}, '${deleteScope}')">Delete question</button>
        </div>
      ` : ''}
    </div>
  `;
}

async function loadQuestions() {
  try {
    const response = await fetch(`${API_URL}/questions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const questions = await response.json();

    const container = document.getElementById('questions-list');
    const openQuestions = questions.filter(q => q.status === 'open');
    
    if (openQuestions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">No open questions are available right now</div>
        </div>
      `;
      return;
    }

    container.innerHTML = openQuestions
      .map(question => renderQuestionCard(question, { allowBetting: true }))
      .join('');

    // Refresh the profile to keep points in sync
    await refreshProfile();
  } catch (error) {
    console.error('Error loading questions:', error);
  }
}

async function loadResolvedQuestions() {
  try {
    const response = await fetch(`${API_URL}/questions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const questions = await response.json();
    const resolvedQuestions = questions.filter(question => question.status === 'resolved');
    const container = document.getElementById('resolved-questions-list');

    if (resolvedQuestions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-text">No resolved questions yet</div>
        </div>
      `;
      return;
    }

    container.innerHTML = resolvedQuestions
      .map(question => renderQuestionCard(question, {
        allowBetting: false,
        showDeleteButton: Boolean(currentUser?.is_admin),
        deleteScope: 'resolved',
        showCurrentUserPosition: !currentUser?.is_admin
      }))
      .join('');
  } catch (error) {
    console.error('Error loading resolved questions:', error);
  }
}

// ========== BETS ==========

let currentBet = null;

function openBetModal(questionId, optionId, optionText, questionTitle) {
  currentBet = { questionId, optionId, optionText, questionTitle };
  
  const modal = document.getElementById('bet-modal');
  const content = document.getElementById('bet-modal-content');
  
  content.innerHTML = `
    <p><strong>Question:</strong> ${questionTitle}</p>
    <p><strong>Your choice:</strong> ${optionText}</p>
    <p><strong>Available points:</strong> ${currentUser.points.toFixed(2)}</p>
    
    <input type="number" id="bet-amount" class="bet-amount-input" placeholder="Points to spend" min="0.1" step="0.1" />
    
    <div class="bet-info" id="bet-calculation"></div>
    
    <button class="btn-primary" onclick="placeBet()">Confirm bet</button>
  `;
  
  modal.style.display = 'block';
  
  // Add a live preview handler
  document.getElementById('bet-amount').addEventListener('input', calculateBetPreview);
}

function closeBetModal() {
  document.getElementById('bet-modal').style.display = 'none';
  currentBet = null;
}

function openPasswordModal() {
  document.getElementById('password-modal').style.display = 'block';
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-new-password').value = '';
}

function closePasswordModal() {
  document.getElementById('password-modal').style.display = 'none';
}

async function changePassword() {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmNewPassword = document.getElementById('confirm-new-password').value;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    alert('Please fill in all fields');
    return;
  }

  if (newPassword.length < 6) {
    alert('The new password must be at least 6 characters long');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    alert('The new password confirmation does not match');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (response.ok) {
      closePasswordModal();
      alert('Password updated successfully');
    } else {
      alert(data.error || 'Failed to update password');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    alert('Unable to connect to the server');
  }
}

async function calculateBetPreview() {
  const amount = parseFloat(document.getElementById('bet-amount').value);
  const calcDiv = document.getElementById('bet-calculation');
  
  if (!amount || amount <= 0) {
    calcDiv.innerHTML = '';
    return;
  }
  
  if (amount > currentUser.points) {
    calcDiv.innerHTML = '<p style="color: var(--danger-color)">⚠️ Not enough points</p>';
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/questions/${currentBet.questionId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const question = await response.json();
    const liquidity = Number(question.liquidity_param) || 50;
    const optionIndex = question.options.findIndex(option => option.id === currentBet.optionId);

    if (optionIndex === -1) {
      throw new Error('Selected option not found in question market');
    }

    const trade = solveLMSRTradeForSpend(
      question.options.map(option => option.total_shares || 0),
      optionIndex,
      amount,
      liquidity
    );

    const currentProbability = trade.probabilitiesBefore[optionIndex] || 0;
    const nextProbability = trade.probabilitiesAfter[optionIndex] || 0;
    const shares = trade.quantity;
    const averagePrice = shares > 0 ? amount / shares : 0;
    
    calcDiv.innerHTML = `
      <p><strong>Stake:</strong> ${amount.toFixed(2)} points</p>
      <p><strong>Current probability:</strong> ${formatProbability(currentProbability)}</p>
      <p><strong>Estimated shares received:</strong> ${shares.toFixed(4)}</p>
      <p><strong>Average price paid:</strong> ${averagePrice.toFixed(4)} point per share</p>
      <p><strong>Probability after this trade:</strong> ${formatProbability(nextProbability)}</p>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">
        LMSR keeps all answer probabilities normalized. If this option wins, each share pays out 1 point at resolution.
      </p>
    `;
  } catch (error) {
    console.error('Error calculating preview:', error);
  }
}

async function placeBet() {
  const amount = parseFloat(document.getElementById('bet-amount').value);
  
  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  if (amount > currentUser.points) {
    alert('Not enough points');
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
      alert(`Bet placed. You spent ${amount.toFixed(2)} points, bought ${data.shares.toFixed(4)} shares at an average cost of ${data.price.toFixed(4)} point per share, and moved the probability from ${formatProbability(data.probabilityBefore || 0)} to ${formatProbability(data.probabilityAfter || 0)}.`);
      closeBetModal();
      await refreshProfile();
      loadQuestions();
    } else {
      alert(data.error || 'Failed to place bet');
    }
  } catch (error) {
    alert('Unable to connect to the server');
    console.error(error);
  }
}

// ========== MY BETS ==========

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
          <div class="empty-state-text">You have not placed any bets yet</div>
        </div>
      `;
      return;
    }

    container.innerHTML = bets.map(bet => {
      let statusClass = 'bet-status-pending';
      let statusText = 'Open';
      let amountLabel = `-${bet.amount.toFixed(2)} pts staked`;
      const isOwnBet = !bet.bettor_username || bet.bettor_username === currentUser.username;
      const pickLabel = isOwnBet ? 'Your pick' : `${bet.bettor_username}'s pick`;
      const stakeLabel = isOwnBet ? 'Original stake' : `${bet.bettor_username}'s stake`;
      
      if (bet.question_status === 'resolved') {
        if (bet.is_winner) {
          statusClass = 'bet-status-won';
          statusText = 'Won';
          amountLabel = `+${bet.payout.toFixed(2)} pts paid out`;
        } else {
          statusClass = 'bet-status-lost';
          statusText = 'Lost';
        }
      }
      
      return `
        <div class="bet-item">
          <div class="bet-item-header">
            <div class="bet-question">${bet.question_title}</div>
            <div class="bet-amount">${amountLabel}</div>
          </div>
          <div class="bet-details">
            ${!isOwnBet ? `<p><strong>Bettor:</strong> ${bet.bettor_username}</p>` : ''}
            <p><strong>${pickLabel}:</strong> ${bet.option_text}</p>
            <p><strong>${stakeLabel}:</strong> ${bet.amount.toFixed(2)} points</p>
            <p><strong>Average purchase price:</strong> ${bet.price.toFixed(4)} point per share • <strong>Shares bought:</strong> ${bet.shares.toFixed(4)}</p>
            ${bet.is_winner ? `<p><strong>Payout at resolution:</strong> ${bet.payout.toFixed(2)} points</p>` : ''}
            <p><strong>Date:</strong> ${formatDate(bet.created_at)}</p>
            <span class="bet-status ${statusClass}">${statusText}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading bets:', error);
  }
}

// ========== LEADERBOARD ==========

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
          <div class="empty-state-text">No leaderboard yet</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="leaderboard-table">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((user, index) => `
              <tr>
                <td><span class="rank rank-${index + 1}">${index + 1}</span></td>
                <td>${user.username}${user.id === currentUser.id ? ' (You)' : ''}</td>
                <td><strong>${user.points.toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Error loading leaderboard:', error);
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
    alert('Please enter a title');
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
    alert('Please enter at least 2 options');
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
      alert('Question created successfully.');
      
      // Reset the form
      document.getElementById('new-question-title').value = '';
      document.getElementById('new-question-description').value = '';
      for (let i = 1; i <= optionCount; i++) {
        const input = document.getElementById(`option-${i}`);
        if (input) input.value = '';
      }
      
      loadAdminData();
    } else {
      alert(data.error || 'Failed to create question');
    }
  } catch (error) {
    alert('Unable to connect to the server');
    console.error(error);
  }
}

async function loadAdminData() {
  try {
    const [questionsResponse, usersResponse] = await Promise.all([
      fetch(`${API_URL}/questions`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    ]);

    const questions = await questionsResponse.json();
    const users = await usersResponse.json();

    const usersContainer = document.getElementById('admin-users-list');
    if (users.length === 0) {
      usersContainer.innerHTML = '<p style="color: var(--text-secondary);">No users found</p>';
    } else {
      usersContainer.innerHTML = `
        <div class="admin-users-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Points</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(user => `
                <tr>
                  <td>${user.username}${user.id === currentUser.id ? ' (You)' : ''}</td>
                  <td><span class="user-role ${user.is_admin ? 'user-role-admin' : 'user-role-user'}">${user.is_admin ? 'Admin' : 'User'}</span></td>
                  <td><strong>${user.points.toFixed(2)}</strong></td>
                  <td>${formatDate(user.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    const container = document.getElementById('questions-to-resolve');

    if (questions.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary);">No questions</p>';
      return;
    }

    container.innerHTML = questions.map(question => `
      <div class="question-card">
        <div class="question-header">
          <div class="question-title">
            ${question.title}
            <span class="status-badge status-${question.status}">${question.status === 'open' ? 'Open' : 'Resolved'}</span>
          </div>
          <div class="question-meta">By ${question.creator_name} • ${formatDate(question.created_at)}</div>
        </div>
        ${question.description ? `<div class="question-description">${question.description}</div>` : ''}
        <div class="options-grid">
          ${question.options.map(option => `
            <div class="option-item ${option.is_correct ? 'option-correct' : ''}">
              <div class="option-info">
                <div class="option-text">${option.text}</div>
                <div class="option-stats">${option.bet_count} bets • ${option.total_shares.toFixed(2)} shares outstanding</div>
              </div>
              <div class="option-price">${formatProbability(option.probability || 0)}</div>
              ${question.status === 'open' ? `
                <button class="btn-resolve" onclick="resolveQuestion(${question.id}, ${option.id})">
                  Mark as correct
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>
        <div class="question-admin-actions">
          <button class="btn-danger" onclick="deleteQuestion(${question.id}, '${question.status}')">Delete question</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading admin data:', error);
  }
}

async function resetAdminPoints() {
  if (!confirm('Reset your admin account to 1000 points?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/admin/reset-my-points`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await response.json();

    if (response.ok) {
      await Promise.all([refreshProfile(), loadAdminData(), loadLeaderboard()]);
      alert(data.message);
    } else {
      alert(data.error || 'Failed to reset admin points');
    }
  } catch (error) {
    console.error('Error resetting admin points:', error);
    alert('Unable to connect to the server');
  }
}

async function resetAllUsersPoints() {
  if (!confirm('Reset all non-admin users to 100 points?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/admin/reset-users-points`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await response.json();

    if (response.ok) {
      await Promise.all([loadAdminData(), loadLeaderboard()]);
      alert(data.message);
    } else {
      alert(data.error || 'Failed to reset user points');
    }
  } catch (error) {
    console.error('Error resetting user points:', error);
    alert('Unable to connect to the server');
  }
}

async function deleteQuestion(questionId, status) {
  const normalizedStatus = status === 'open' ? 'open' : 'resolved';
  const confirmationMessage = normalizedStatus === 'open'
    ? 'Delete this open question? Current stakes will be refunded.'
    : 'Delete this resolved question? This will not change points that were already distributed.';

  if (!confirm(confirmationMessage)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/questions/${questionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await response.json();

    if (response.ok) {
      await Promise.all([
        refreshProfile(),
        loadAdminData(),
        loadQuestions(),
        loadResolvedQuestions(),
        loadMyBets(),
        loadLeaderboard()
      ]);
      alert(data.message);
    } else {
      alert(data.error || 'Failed to delete question');
    }
  } catch (error) {
    console.error('Error deleting question:', error);
    alert('Unable to connect to the server');
  }
}

async function resolveQuestion(questionId, optionId) {
  if (!confirm('Are you sure you want to resolve this question? This action cannot be undone.')) {
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
      alert('Question resolved. Winnings have been distributed.');
      await Promise.all([
        refreshProfile(),
        loadAdminData(),
        loadQuestions(),
        loadResolvedQuestions(),
        loadMyBets(),
        loadLeaderboard()
      ]);
    } else {
      alert(data.error || 'Failed to resolve question');
    }
  } catch (error) {
    alert('Unable to connect to the server');
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
    console.error('Error refreshing profile:', error);
  }
}

// Claim the daily bonus
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
        await refreshProfile(); // Refresh to display the new points
      }
    } else {
      alert('Error: ' + (data.error || 'Unable to claim the bonus'));
    }
  } catch (error) {
    console.error('Error while claiming the bonus:', error);
    alert('Error while claiming the bonus');
  }
}


function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-GB');
}

// ========== INITIALISATION ==========

window.onclick = function(event) {
  const betModal = document.getElementById('bet-modal');
  const passwordModal = document.getElementById('password-modal');

  if (event.target === betModal) {
    closeBetModal();
  }

  if (event.target === passwordModal) {
    closePasswordModal();
  }
};

// Check whether the user is already signed in
window.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedToken && savedUser) {
    authToken = savedToken;
    currentUser = JSON.parse(savedUser);
    showMainSection();
  }
});
