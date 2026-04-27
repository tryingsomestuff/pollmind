# 💰 Gestion des Points - Que se passe-t-il à 0 ?

## 📊 Situation actuelle

### Scénario : Arriver à 0 points

**Ce qui se passe :**
1. Vous pariez tous vos points sur des questions
2. Vous perdez tous vos paris
3. **Vous arrivez à 0 points** 💸

**Conséquences :**
- ❌ Vous **ne pouvez plus parier** (le système vérifie `if (user.points < amount)`)
- ✅ Vous **pouvez toujours voir** les questions et les résultats
- ✅ Vous **restez dans le classement** (avec 0 points)
- ✅ Si vous aviez des paris en cours qui gagnent, vous récupérez des points

### Vérification du code

```javascript
// Dans server.js, ligne 266
if (user.points < amount) {
  return res.status(400).json({ error: 'Points insuffisants' });
}
```

→ Si vous avez 0 points, vous ne pouvez parier aucun montant > 0

## 🎯 Solutions possibles

### Option 1 : Redistribution périodique (recommandé pour usage interne)
**Principe :** Tous les participants reçoivent régulièrement de nouveaux points

**Implémentation :**
```javascript
// Redistribuer des points (à faire manuellement ou automatiquement)
async function redistributePoints() {
  // Option A: Reset tout le monde à 100
  db.run('UPDATE users SET points = 100 WHERE is_admin = 0');
  
  // Option B: Donner 50 points à ceux qui ont moins de 10
  db.run('UPDATE users SET points = points + 50 WHERE points < 10 AND is_admin = 0');
}
```

**Quand l'utiliser :**
- 📅 Chaque mois (nouveau cycle)
- 🎮 Après une série de questions importantes
- 🏆 Reset saisonnier avec classement

### Option 2 : Points journaliers (type jeu mobile)
**Principe :** Chaque jour, vous recevez des points bonus

**Implémentation :**
```javascript
// Ajouter une colonne last_bonus_date
// Donner 10 points par jour aux utilisateurs actifs

app.post('/api/daily-bonus', authenticateToken, (req, res) => {
  const user = queryOne('SELECT last_bonus_date FROM users WHERE id = ?', [req.user.id]);
  
  const today = new Date().toISOString().split('T')[0];
  const lastBonus = user.last_bonus_date?.split('T')[0];
  
  if (lastBonus !== today) {
    run('UPDATE users SET points = points + 10, last_bonus_date = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id]);
    res.json({ message: 'Bonus journalier reçu!', bonus: 10 });
  } else {
    res.json({ message: 'Bonus déjà réclamé aujourd\'hui' });
  }
});
```

### Option 3 : Prêt de points (système de crédit)
**Principe :** Les utilisateurs à 0 peuvent emprunter des points

**Implémentation :**
```javascript
// Permettre d'emprunter jusqu'à -50 points
if (user.points < amount) {
  if (user.points + 50 >= amount) {  // Peut emprunter
    // Autoriser le pari mais marquer comme "en dette"
  } else {
    return res.status(400).json({ error: 'Points insuffisants (même avec crédit)' });
  }
}
```

**Note :** Plus complexe, nécessite de gérer les dettes

### Option 4 : Missions/Achievements (gamification)
**Principe :** Gagner des points en accomplissant des actions

**Exemples :**
- ✅ Premier pari : +5 points
- 📝 Commenter une question : +2 points
- 🎯 Parier contre la majorité : +3 points bonus si victoire
- 📊 Participer à 10 questions : +20 points

### Option 5 : Marché secondaire (avancé)
**Principe :** Vendre/acheter des shares entre utilisateurs

**Note :** Très complexe, nécessite un système d'ordres

## 💡 Recommandation pour PollMind

**Pour un usage interne en entreprise, je recommande :**

### Approche hybride : Reset mensuel + Points bonus

```javascript
// 1. Reset mensuel automatique (à programmer via cron)
function monthlyReset() {
  // Sauvegarder le classement du mois
  const topUsers = query('SELECT * FROM users WHERE is_admin = 0 ORDER BY points DESC LIMIT 10');
  // Log ou save dans une table leaderboard_history
  
  // Reset tout le monde à 100 points
  run('UPDATE users SET points = 100 WHERE is_admin = 0');
  
  console.log('🔄 Reset mensuel effectué - Tous les utilisateurs ont 100 points');
}

// 2. Bonus pour participation (immédiat)
function giveParticipationBonus(userId) {
  run('UPDATE users SET points = points + 5 WHERE id = ?', [userId]);
}

// 3. Safety net : Minimum garanti
app.get('/api/check-minimum', authenticateToken, (req, res) => {
  const user = queryOne('SELECT points FROM users WHERE id = ?', [req.user.id]);
  
  if (user.points < 5) {
    run('UPDATE users SET points = 10 WHERE id = ?', [req.user.id]);
    res.json({ message: 'Vous avez reçu 10 points de secours!', newBalance: 10 });
  }
});
```

## 🎮 Expérience utilisateur

### Message à afficher quand points = 0

```javascript
// Dans le frontend (app.js)
if (currentUser.points === 0) {
  alert(`
    😢 Vous n'avez plus de points !
    
    Options :
    - Attendez vos paris en cours (ils peuvent encore gagner!)
    - Contactez un admin pour obtenir des points bonus
    - Le prochain reset mensuel vous redonnera 100 points
    
    En attendant, vous pouvez toujours consulter les questions et le classement.
  `);
}
```

## 📝 À implémenter en priorité

Pour améliorer l'expérience dès maintenant :

1. **Avertissement à 20 points** : 
   - "⚠️ Attention, il vous reste peu de points!"

2. **Bouton "Demander des points bonus"** (admin approuve) :
   ```javascript
   app.post('/api/request-bonus', authenticateToken, (req, res) => {
     // Notifier les admins
     // Admin peut approuver et donner 50 points
   });
   ```

3. **Historique des gains/pertes** :
   - Afficher un graphique de l'évolution des points
   - Aide à comprendre sa stratégie

4. **Mode "spectateur"** quand à 0 :
   - Interface claire : "Mode spectateur - En attente de points"
   - Toujours voir tout, mais ne pas parier

## 🎯 Conclusion

**État actuel :** Un utilisateur à 0 points est bloqué mais peut récupérer via :
- ✅ Des paris en cours qui gagnent
- ✅ Intervention manuelle d'un admin

**À améliorer :** Implémenter au moins un système de redistribution pour maintenir l'engagement !

La solution la plus simple et efficace pour un usage interne : **Reset mensuel + Safety net à 5 points**
