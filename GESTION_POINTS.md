# 💰 Gestion des Points

## 📊 Système actuel

### Points de départ
- Chaque nouvel utilisateur commence avec **100 points**
- Les admins ont **1000 points** par défaut
- Un admin peut reinitialiser son propre solde a `1000` et celui des utilisateurs standards a `100`

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

## 🎯 Cycle d'une mise

Quand un utilisateur place une mise :

1. Le montant de la mise est debite immediatement de son solde.
2. Le moteur LMSR calcule combien de shares cette depense achete sur l'option choisie.
3. La probabilite de cette option monte, et celles des autres baissent en consequence.

Formellement, si l'etat du marche est `q` et la liquidite `b`, le cout du marche est :

```
C(q) = b * ln(sum_i exp(q_i / b))
```

Le backend choisit `Delta q` de sorte que :

```
C(q + Delta q * e_k) - C(q) = montant_de_la_mise
```

ou `e_k` est le vecteur unitaire de l'option selectionnee.

La probabilite affichee pour l'option `i` est :

```
p_i = exp(q_i / b) / sum_j exp(q_j / b)
```

Ces probabilites somment toujours a `1`.

## 🏁 Regle de resolution

- Si votre option gagne, vous recevez `1` point par share detenu.
- Si vous detenez `s` shares, votre payout vaut donc `s`.
- Si votre option perd, votre payout vaut `0`.
- Les payouts sont stockes dans `bets.payout` au moment de la resolution pour figer l'historique.

Cette regle remplace l'ancien partage proportionnel d'un pool global.

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
3. **Intervention admin** : Un admin peut remettre les soldes a la valeur par defaut

## 🎯 Recommandations d'usage

### Pour maintenir l'engagement
- Encouragez les utilisateurs à réclamer leur bonus quotidien
- Les utilisateurs à court de points peuvent récupérer en ~10 jours (bonus quotidien)
- Pensez à faire des questions régulièrement pour maintenir l'activité

### Stratégies de jeu
- Ne jamais tout parier sur une seule question
- Diversifier ses paris pour limiter les risques
- Comprendre qu'une meme depense achete moins de shares quand l'option est deja fortement achetee
- Garder une réserve minimum pour continuer à participer
