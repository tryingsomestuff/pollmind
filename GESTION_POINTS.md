# 💰 Gestion des Points

## 📊 Système actuel

### Points de départ
- Chaque nouvel utilisateur commence avec **100 points**
- Les admins ont **1000 points** par défaut

### 🎁 Bonus journalier (✅ IMPLÉMENTÉ)

Chaque utilisateur peut réclamer **10 points par jour** :

**Comment l'utiliser :**
1. Cliquez sur le bouton **🎁 Bonus** dans le header
2. Si vous n'avez pas encore réclamé aujourd'hui → Vous recevez 10 points
3. Si vous avez déjà réclamé → Message "Revenez demain!"
4. Le bonus se réinitialise à minuit (UTC)

**Implémentation technique :**
- Colonne `last_bonus_date` dans la table `users`
- Route API : `POST /api/daily-bonus`
- Vérifie la date de dernière réclamation
- Empêche la réclamation multiple le même jour

### Scénario : Arriver à 0 points

**Ce qui se passe :**
1. Vous pariez tous vos points sur des questions
2. Vous perdez tous vos paris
3. **Vous arrivez à 0 points** 💸

**Conséquences :**
- ❌ Vous **ne pouvez plus parier** (vérification `user.points < amount`)
- ✅ Vous **pouvez toujours voir** les questions et les résultats
- ✅ Vous **restez dans le classement** (avec 0 points)
- ✅ Si vous aviez des paris en cours qui gagnent, vous récupérez des points
- ✅ Vous pouvez **réclamer votre bonus journalier** (+10 points/jour)

### Comment récupérer des points

1. **Bonus journalier** : +10 points par jour (bouton 🎁)
2. **Paris en cours** : Si un de vos paris gagne, vous récupérez des points
3. **Intervention admin** : Un admin peut manuellement ajouter des points

## 🎯 Recommandations d'usage

### Pour maintenir l'engagement
- Encouragez les utilisateurs à réclamer leur bonus quotidien
- Les utilisateurs à court de points peuvent récupérer en ~10 jours (bonus quotidien)
- Pensez à faire des questions régulièrement pour maintenir l'activité

### Stratégies de jeu
- Ne jamais tout parier sur une seule question
- Diversifier ses paris pour limiter les risques
- Parier tôt sur les options impopulaires (prix bas, gains potentiels élevés)
- Garder une réserve minimum pour continuer à participer
