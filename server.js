const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDatabase, query, queryOne, run, saveDatabase } = require('./db');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'pollmind-secret-key-change-in-production';

let dbReady = false;

// Initialiser la base de données avant de démarrer
initDatabase().then(() => {
  dbReady = true;
  console.log('✓ Base de données prête');
}).catch(err => {
  console.error('Erreur initialisation DB:', err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Middleware pour vérifier que la DB est prête
app.use((req, res, next) => {
  if (!dbReady) {
    return res.status(503).json({ error: 'Base de données en cours d\'initialisation' });
  }
  next();
});

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Middleware admin
const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

// ========== ROUTES AUTHENTIFICATION ==========

// Inscription
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username et password requis' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    
    res.json({ message: 'Inscription réussie' });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Nom d\'utilisateur déjà pris' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Connexion
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, SECRET_KEY, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin,
        points: user.points
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Profil utilisateur
app.get('/api/profile', authenticateToken, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, is_admin, points FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Bonus journalier
app.post('/api/daily-bonus', authenticateToken, (req, res) => {
  try {
    const user = queryOne('SELECT points, last_bonus_date FROM users WHERE id = ?', [req.user.id]);
    
    const today = new Date().toISOString().split('T')[0];
    // SQLite stocke les dates avec un espace, pas un 'T'
    const lastBonus = user.last_bonus_date ? user.last_bonus_date.split(' ')[0] : null;
    
    if (lastBonus !== today) {
      run('UPDATE users SET points = points + 10, last_bonus_date = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id]);
      res.json({ 
        message: 'Bonus journalier reçu!', 
        bonus: 10, 
        newBalance: user.points + 10 
      });
    } else {
      res.json({ 
        message: 'Bonus déjà réclamé aujourd\'hui',
        alreadyClaimed: true,
        nextBonus: 'Revenez demain!'
      });
    }
  } catch (error) {
    console.error('Erreur bonus journalier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== ROUTES QUESTIONS ==========

// Créer une question (admin seulement)
app.post('/api/questions', authenticateToken, requireAdmin, (req, res) => {
  const { title, description, options } = req.body;

  if (!title || !options || options.length < 2) {
    return res.status(400).json({ error: 'Titre et au moins 2 options requis' });
  }

  try {
    run('INSERT INTO questions (title, description, created_by) VALUES (?, ?, ?)', [title, description || '', req.user.id]);
    
    const question = queryOne('SELECT id FROM questions ORDER BY id DESC LIMIT 1');
    const questionId = question.id;

    options.forEach(option => {
      run('INSERT INTO options (question_id, text) VALUES (?, ?)', [questionId, option.text]);
    });

    res.json({ message: 'Question créée avec succès', questionId });
  } catch (error) {
    res.status(500).json({ error: 'Erreur création question' });
  }
});

// Lister toutes les questions
app.get('/api/questions', authenticateToken, (req, res) => {
  try {
    const questions = query('SELECT q.*, u.username as creator_name FROM questions q JOIN users u ON q.created_by = u.id ORDER BY q.created_at DESC');

    const questionsWithDetails = questions.map(q => {
      const options = query('SELECT * FROM options WHERE question_id = ?', [q.id]);

      const optionsWithStats = options.map(opt => {
        const stats = queryOne('SELECT SUM(shares) as total_shares, COUNT(*) as bet_count FROM bets WHERE option_id = ?', [opt.id]);
        
        return {
          ...opt,
          total_shares: stats?.total_shares || 0,
          bet_count: stats?.bet_count || 0
        };
      });

      return { ...q, options: optionsWithStats };
    });

    res.json(questionsWithDetails);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Détails d'une question
app.get('/api/questions/:id', authenticateToken, (req, res) => {
  const questionId = req.params.id;

  try {
    const question = queryOne('SELECT * FROM questions WHERE id = ?', [questionId]);

    if (!question) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    const options = query('SELECT * FROM options WHERE question_id = ?', [questionId]);

    res.json({ ...question, options });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Résoudre une question (admin seulement)
app.post('/api/questions/:id/resolve', authenticateToken, requireAdmin, (req, res) => {
  const { optionId } = req.body;
  const questionId = req.params.id;

  try {
    const question = queryOne('SELECT id, status FROM questions WHERE id = ?', [questionId]);

    if (!question) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    if (question.status !== 'open') {
      return res.status(400).json({ error: 'Cette question est deja resolue' });
    }

    const option = queryOne('SELECT id FROM options WHERE id = ? AND question_id = ?', [optionId, questionId]);

    if (!option) {
      return res.status(400).json({ error: 'Option invalide pour cette question' });
    }

    run('UPDATE questions SET status = ?, resolution = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?', ['resolved', optionId, questionId]);
    run('UPDATE options SET is_correct = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE question_id = ?', [optionId, questionId]);

    // Redistribuer les gains
    const payoutSummary = distributeWinnings(questionId, optionId);

    res.json({ message: 'Question résolue', payoutSummary });
  } catch (error) {
    res.status(500).json({ error: 'Erreur résolution question' });
  }
});

// Fonction pour redistribuer les gains
function distributeWinnings(questionId, correctOptionId) {
  try {
    const winningBets = query('SELECT id, user_id, shares FROM bets WHERE question_id = ? AND option_id = ?', [questionId, correctOptionId]);

    const poolData = queryOne('SELECT SUM(amount) as total_pool FROM bets WHERE question_id = ?', [questionId]);
    const totalPool = poolData?.total_pool || 0;

    if (winningBets.length === 0) {
      return { totalPool, totalWinningShares: 0, winnerCount: 0 };
    }

    const totalWinningShares = winningBets.reduce((sum, bet) => sum + bet.shares, 0);

    winningBets.forEach(bet => {
      const winnings = (bet.shares / totalWinningShares) * totalPool;
      run('UPDATE users SET points = points + ? WHERE id = ?', [winnings, bet.user_id]);
    });

    return {
      totalPool,
      totalWinningShares,
      winnerCount: winningBets.length
    };
  } catch (error) {
    console.error('Erreur distribution gains:', error);
    throw error;
  }
}

// ========== ROUTES PARIS ==========

// Calculer le prix actuel
function calculatePrice(totalShares) {
  const basePrice = 0.5;
  const priceImpact = totalShares * 0.01;
  return Math.min(0.95, Math.max(0.05, basePrice + priceImpact));
}

// Placer un pari
app.post('/api/bets', authenticateToken, (req, res) => {
  const { questionId, optionId, amount } = req.body;

  if (!questionId || !optionId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Données invalides' });
  }

  try {
    const question = queryOne('SELECT status FROM questions WHERE id = ?', [questionId]);
    
    if (!question || question.status !== 'open') {
      return res.status(400).json({ error: 'Question fermée ou inexistante' });
    }

    const user = queryOne('SELECT points FROM users WHERE id = ?', [req.user.id]);
    
    if (user.points < amount) {
      return res.status(400).json({ error: 'Points insuffisants' });
    }

    const stats = queryOne('SELECT SUM(shares) as total_shares FROM bets WHERE option_id = ?', [optionId]);

    const currentTotalShares = stats?.total_shares || 0;
    const price = calculatePrice(currentTotalShares);
    const shares = amount / price;

    run('UPDATE users SET points = points - ? WHERE id = ?', [amount, req.user.id]);
    run('INSERT INTO bets (user_id, question_id, option_id, amount, price, shares) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, questionId, optionId, amount, price, shares]);

    res.json({ message: 'Pari enregistré', shares, price });
  } catch (error) {
    console.error('Erreur pari:', error);
    res.status(500).json({ error: 'Erreur enregistrement pari' });
  }
});

// Historique des paris
app.get('/api/my-bets', authenticateToken, (req, res) => {
  try {
    const bets = query(
      'SELECT b.*, q.title as question_title, q.status as question_status, q.resolution as question_resolution, o.text as option_text FROM bets b JOIN questions q ON b.question_id = q.id JOIN options o ON b.option_id = o.id WHERE b.user_id = ? ORDER BY b.created_at DESC',
      [req.user.id]
    );

    const resolvedQuestionIds = [...new Set(
      bets
        .filter(bet => bet.question_status === 'resolved')
        .map(bet => bet.question_id)
    )];

    const resolutionStats = new Map();

    resolvedQuestionIds.forEach(questionId => {
      const poolData = queryOne('SELECT SUM(amount) as total_pool FROM bets WHERE question_id = ?', [questionId]);
      const winningSharesData = queryOne(
        'SELECT SUM(shares) as total_winning_shares FROM bets WHERE question_id = ? AND option_id = (SELECT resolution FROM questions WHERE id = ?)',
        [questionId, questionId]
      );

      resolutionStats.set(questionId, {
        totalPool: poolData?.total_pool || 0,
        totalWinningShares: winningSharesData?.total_winning_shares || 0
      });
    });

    const enrichedBets = bets.map(bet => {
      const isResolved = bet.question_status === 'resolved';
      const isWinningBet = isResolved && Number(bet.question_resolution) === Number(bet.option_id);
      let payout = 0;

      if (isWinningBet) {
        const stats = resolutionStats.get(bet.question_id);

        if (stats && stats.totalWinningShares > 0) {
          payout = (bet.shares / stats.totalWinningShares) * stats.totalPool;
        }
      }

      return {
        ...bet,
        is_resolved: isResolved,
        is_winner: isWinningBet,
        payout
      };
    });

    res.json(enrichedBets);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Leaderboard
app.get('/api/leaderboard', authenticateToken, (req, res) => {
  try {
    const users = query('SELECT id, username, points FROM users WHERE is_admin = 0 ORDER BY points DESC LIMIT 10');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== DÉMARRAGE SERVEUR ==========

app.listen(PORT, () => {
  console.log(`🚀 Serveur PollMind démarré sur http://localhost:\${PORT}`);
});