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
