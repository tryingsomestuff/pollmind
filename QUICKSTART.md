# 🚀 Guide de démarrage rapide - PollMind

## Installation terminée ! ✅

### Votre application est prête et fonctionne sur : **http://localhost:3000**

## 🔑 Compte admin par défaut

- **Username:** `admin`
- **Password:** `admin123`

## 📦 Technologies utilisées

- **Backend:** Node.js + Express
- **Base de données:** SQLite (via sql.js - pas de compilation native)
- **Frontend:** HTML/CSS/JavaScript vanilla
- **Authentification:** JWT + bcryptjs

## 🎯 Fonctionnalités

### Pour tous les utilisateurs
- ✅ Inscription et connexion
- ✅ 100 points de départ
- ✅ Parier sur des questions avec pricing dynamique
- ✅ Voir l'historique de ses paris
- ✅ Classement des participants

### Pour les admins
- ✅ Créer des questions
- ✅ Résoudre des questions
- ✅ Distribution automatique des gains

## 💡 Pricing dynamique (Automated Market Maker)

### Comment ça fonctionne ?

Le système utilise un **mécanisme de marché automatisé** (AMM - Automated Market Maker) similaire aux plateformes comme Polymarket ou Augur. Voici le principe :

**Formule de prix :**
```
Prix = 0.50 + (nombre_de_shares_déjà_pariées × 0.01)
Prix minimum : 5%
Prix maximum : 95%
```

**Exemple concret :**

Imaginons une question : *"L'IA générative va-t-elle remplacer 30% des emplois de développeurs d'ici 2030 ?"*

Options :
- A) Oui, au moins 30%
- B) Non, moins de 30%

**Évolution des prix :**

1. **Au début** (0 shares pariées) :
   - Prix de A : 50% (0.50)
   - Prix de B : 50% (0.50)
   - Les deux options sont équilibrées

2. **Après quelques paris** (20 shares sur A, 5 shares sur B) :
   - Prix de A : 50% + (20 × 1%) = **70%** → L'option A devient plus chère !
   - Prix de B : 50% + (5 × 1%) = **55%** → L'option B reste abordable
   - Si vous pariez 10 points sur A, vous recevez : 10 / 0.70 = **14.3 shares**
   - Si vous pariez 10 points sur B, vous recevez : 10 / 0.55 = **18.2 shares**

3. **Plus tard** (50 shares sur A, 10 shares sur B) :
   - Prix de A : 50% + (50 × 1%) = **95%** (plafonné) → Très cher !
   - Prix de B : 50% + (10 × 1%) = **60%**

> **⚠️ Note importante :** Dans l'implémentation actuelle, les prix évoluent **indépendamment** et ne somment pas forcément à 100% (ex: A=70% + B=55% = 125%). 
> 
> Ce sont des **coûts relatifs**, pas des probabilités pures au sens mathématique. Les vrais marchés de prédiction (Polymarket, Augur) utilisent des algorithmes comme LMSR où les prix somment toujours à 100%.
> 
> Pour une explication complète sur cette différence et comment l'améliorer, consultez [PRICING_EXPLANATION.md](PRICING_EXPLANATION.md)



### 🎯 Pourquoi c'est intéressant ?

#### 1. **Agrégation de l'intelligence collective**
- Le prix reflète la **probabilité perçue** par l'ensemble des participants
- Si une option atteint 80%, c'est que la majorité pense qu'elle a 80% de chances de se réaliser
- Plus efficace qu'un simple vote à main levée

#### 2. **Incitation à la réflexion**
- Les participants utilisent leurs **propres points** → ils réfléchissent avant de parier
- Contrairement à un sondage gratuit, il y a un coût réel à se tromper
- Cela encourage à faire des recherches et à argumenter

#### 3. **Opportunités pour les "contrarians"**
- Si tout le monde parie sur A (prix à 90%), mais que vous pensez que B va gagner :
  - Parier sur B est **très rentable** (prix bas = beaucoup de shares)
  - Si B gagne, vous récupérez une grosse part du pool total
- Cela permet de **corriger les biais de groupe**

#### 4. **Découverte de prix en temps réel**
- Les prix évoluent selon l'opinion collective
- Nouveaux arguments ou infos → les gens parient différemment → les prix s'ajustent
- C'est un **baromètre vivant** de ce que pense le groupe

#### 5. **Mécanisme auto-régulé**
- Pas besoin d'intervention manuelle pour ajuster les cotes
- Le marché se régule naturellement
- Les options sous-évaluées attirent les parieurs → le prix remonte

### 📊 Exemple de gain

**Scénario :**
- Question : "La migration vers le cloud sera-t-elle terminée en 2026 ?"
- Vous pariez **20 points** sur "Oui" quand le prix est à **60%**
- Vous recevez : 20 / 0.60 = **33.3 shares**

**Pool total à la résolution :**
- 200 points pariés au total sur les deux options
- Total de shares sur "Oui" : 150 shares
- Vos 33.3 shares représentent : 33.3 / 150 = **22.2% du pool des gagnants**

**Si "Oui" gagne :**
- Vous récupérez : 200 × 22.2% = **44.4 points**
- Profit : 44.4 - 20 = **+24.4 points** (122% de gain !)

**Si "Non" gagne :**
- Vous perdez vos 20 points

### 💭 En résumé

Ce système transforme les **opinions en données quantifiables** :
- Plus qu'un sondage : un vrai marché prédictif
- Chaque participant met sa crédibilité en jeu
- Les prix reflètent les probabilités perçues
- Incite à la recherche d'informations
- Auto-régulé et transparent

C'est exactement ce qu'utilisent les grandes plateformes de prédiction pour avoir de meilleures prévisions que les sondages traditionnels !

## 🔧 Commandes utiles

```bash
# Démarrer le serveur
npm start

# Développement avec auto-reload
npm run dev

# Arrêter le serveur
Ctrl+C dans le terminal
```

## 📁 Fichiers importants

- `server.js` - Serveur Express avec API REST
- `db.js` - Gestion de la base de données SQLite
- `public/index.html` - Interface utilisateur
- `public/app.js` - Logique frontend
- `public/styles.css` - Styles
- `pollmind.db` - Base de données (créée automatiquement)

## 🌐 Accès depuis Windows

Si vous êtes en WSL2 et voulez accéder depuis Windows :
- Ouvrez votre navigateur Windows
- Allez sur `http://localhost:3000`
- WSL2 forward automatiquement les ports !

## 🎉 C'est parti !

1. Ouvrez http://localhost:3000 dans votre navigateur
2. Connectez-vous avec admin/admin123
3. Créez une question scientifique/technique
4. Invitez vos collègues à parier !

Enjoy! 🧠
