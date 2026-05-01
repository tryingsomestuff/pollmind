# 🚀 Guide de démarrage rapide - PollMind

## Installation terminée ! ✅

### Votre application est prete.

- Installation locale : **http://localhost:3000**
- Docker Compose : **http://localhost:81**

## 🔑 Compte admin par défaut

- Un compte `admin` est cree automatiquement au premier demarrage de la base.
- Le mot de passe initial n'est pas affiche dans l'interface et doit etre change immediatement apres la premiere connexion.

## 📦 Technologies utilisées

- **Backend:** Node.js + Express
- **Base de données:** SQLite (via sql.js - pas de compilation native)
- **Frontend:** HTML/CSS/JavaScript vanilla
- **Authentification:** JWT + bcryptjs

## 🎯 Fonctionnalités

### Pour tous les utilisateurs
- ✅ Inscription et connexion
- ✅ 100 points de départ
- ✅ Parier sur des questions avec probabilites LMSR normalisees
- ✅ Voir l'historique de ses paris
- ✅ Classement des participants
- ✅ Voir les questions resolues et les probabilites finales

### Pour les admins
- ✅ Créer des questions
- ✅ Résoudre des questions
- ✅ Distribution automatique des gains
- ✅ Voir tous les utilisateurs et remettre les soldes a la valeur par defaut

### 🎁 Bonus Journalier

Chaque utilisateur peut réclamer un bonus de **10 points par jour**:

- Cliquez sur le bouton **🎁 Bonus** dans le header
- Si vous n'avez pas encore réclamé aujourd'hui, vous recevrez 10 points
- Si vous avez déjà réclamé, un message vous indiquera de revenir demain
- Le bonus se réinitialise à minuit (UTC)

**Astuce:** Si vous n'avez plus de points, réclamez votre bonus journalier pour pouvoir continuer à parier !


## 💡 Cotation dynamique (LMSR)

### Comment ca fonctionne ?

Le systeme utilise un **market maker LMSR** (Logarithmic Market Scoring Rule), proche des mecanismes employes pour les marches de prediction multi-options.

**Formules :**
```
C(q) = b * ln(sum_i exp(q_i / b))
p_i = exp(q_i / b) / sum_j exp(q_j / b)
```

Avec :

- `q_i` : le nombre de shares outstanding sur l'option `i`
- `b` : le parametre de liquidite, par defaut `50`
- `p_i` : la probabilite affichee pour l'option `i`

**Exemple concret :**

Imaginons une question a 3 options avec `b = 50` et un etat initial `q = (0, 0, 0)`.

Au depart :

- `p_1 = p_2 = p_3 = 1/3`
- la somme des probabilites vaut toujours `100 %`

Si un utilisateur depense `10` points sur l'option 1 :

1. Le serveur cherche `Delta q` tel que `C(q + Delta q * e_1) - C(q) = 10`
2. Cette quantite de shares est creditee au parieur
3. La probabilite de l'option 1 augmente, celles des autres baissent automatiquement

Le point cle est que l'utilisateur paie un **cout total** pour deplacer le marche, et pas un prix fixe par share sur toute la transaction.

### Resolution

- Si votre option gagne, votre mise paie `1 point par share`.
- Si vous avez achete `18.4` shares, vous recevez `18.4` points a la resolution.
- Si votre option perd, vous perdez uniquement la mise engagee.

Pour les details mathematiques complets, consultez [PRICING_EXPLANATION.md](PRICING_EXPLANATION.md).



### 🎯 Pourquoi c'est intéressant ?

#### 1. **Agrégation de l'intelligence collective**
- Le prix reflète la **probabilité perçue** par l'ensemble des participants
- Si une option atteint 80%, c'est que la majorité pense qu'elle a 80% de chances de se réaliser
- Plus efficace qu'un simple vote à main levée

#### 2. **Incitation à la réflexion**
- Les participants utilisent leurs **propres points** → ils réfléchissent avant de parier
- Contrairement à un sondage gratuit, il y a un coût réel à se tromper
- Cela encourage à faire des recherches et à argumenter

#### 3. **Opportunites pour les "contrarians"**
- Si tout le monde pousse une option vers le haut, son cout marginal augmente
- Les alternatives deviennent relativement plus attractives
- Cela aide le marche a corriger les biais de groupe

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
- Vous depensez `20` points et obtenez `31.7` shares sur une option
- Si cette option gagne, vous recevez `31.7` points
- Votre profit net est alors `31.7 - 20 = 11.7` points
- Si elle perd, vous perdez les `20` points engages

### 💭 En résumé

Ce système transforme les **opinions en données quantifiables** :
- Plus qu'un sondage : un vrai marché prédictif
- Chaque participant met sa crédibilité en jeu
- Les prix reflètent les probabilités perçues
- Incite à la recherche d'informations
- Auto-régulé et transparent

C'est exactement ce qu'utilisent les grandes plateformes de prédiction pour avoir de meilleures prévisions que les sondages traditionnels !

## 🔧 Commandes utiles

### Avec Node.js (installation locale)

```bash
# Démarrer le serveur
npm start

# Développement avec auto-reload
npm run dev

# Arrêter le serveur
Ctrl+C dans le terminal
```

### Avec Docker

```bash
# Démarrer l'application
docker compose up -d

# Voir les logs
docker compose logs -f

# Arrêter l'application
docker compose down

# Backup de la base de données
docker run --rm -v pollmind_pollmind-data:/data \
  -v $(pwd):/backup alpine \
  cp /data/pollmind.db /backup/pollmind-backup-$(date +%Y%m%d).db
```

**📖 Documentation complète :** Consultez [DOCKER.md](DOCKER.md) pour plus d'options

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

1. Ouvrez l'URL adaptee a votre mode d'installation
2. Connectez-vous avec le compte admin initialise au premier demarrage
3. Changez immediatement le mot de passe admin
4. Creez une question scientifique/technique
5. Invitez vos collegues a parier

Enjoy! 🧠
