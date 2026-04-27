# PollMind

Système de marché de prédiction interne pour questions scientifiques et techniques.

## Installation

```bash
npm install
```

## Lancement

```bash
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
