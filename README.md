# PollMind

Système de marché de prédiction interne pour questions scientifiques et techniques.

## 🚀 Démarrage rapide

### Option 1 : Docker (recommandé)

```bash
# Démarrer avec Docker Compose
docker compose up -d

# L'application sera accessible sur http://localhost:3000
```

**Voir [DOCKER.md](DOCKER.md) pour la documentation complète Docker**

### Option 2 : Installation locale (Node.js)

```bash
# Installer les dépendances
npm install

# Démarrer le serveur
npm start
```

Pour le développement avec auto-reload:
```bash
npm run dev

## ⚙️ Configuration NPM Registry

Selon votre environnement, vous devez configurer le registry npm approprié :

### En dehors du réseau Michelin (usage public)

```bash
# Supprimer toute configuration précédente
npm config delete registry

# Configurer le registry public
npm config set registry https://registry.npmjs.org/

# Supprimer les installations précédentes
rm -rf node_modules package-lock.json

# Réinstaller les dépendances
npm install
```

### Sur le réseau Michelin (réseau interne)

```bash
# Supprimer toute configuration précédente
npm config delete registry

# Configurer l'Artifactory Michelin
npm config set registry https://artifactory.michelin.com/api/npm/npm/

# Supprimer les installations précédentes
rm -rf node_modules package-lock.json

# Réinstaller les dépendances
npm install
```

### Rebuild Docker après changement de registry

Après avoir changé le registry et régénéré le \`package-lock.json\`, il faut rebuilder l'image Docker :

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**⚠️ Note importante** : Le \`package-lock.json\` contient les URLs exactes des packages. Il doit être régénéré à chaque changement de registry, ainsi que le dossier \`node_modules\`.

```

## Utilisation

1. Accédez à `http://localhost:3000`
2. Créez un compte ou connectez-vous
3. Les admins peuvent créer des questions
4. Les participants peuvent parier avec leurs points (100 au départ)

## Fonctionnalités

- Authentification utilisateurs (admin/participant)
- Création de questions par les admins
- Système de paris avec pricing dynamique
- Les réponses deviennent plus chères quand elles ont plus de votes
- Gestion automatique des points
