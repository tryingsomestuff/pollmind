# Image Node.js LTS basée sur Alpine (légère)
FROM node:20-alpine

# Métadonnées
LABEL maintainer="PollMind"
LABEL description="Système de marché de prédiction interne"

# Répertoire de travail dans le container
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances (production uniquement)
RUN npm ci --omit=dev

# Copier le reste de l'application
COPY . .

# S'assurer que /app/data/ est vide (pour éviter la pollution du volume Docker)
RUN mkdir -p /app/data && rm -rf /app/data/* /app/data/.[!.]* /app/data/..?*

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Copier le script d'entrée et le rendre exécutable
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Exposer le port 3000
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3000

# Healthcheck pour vérifier que le serveur répond
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/profile', (r) => {process.exit(r.statusCode === 401 ? 0 : 1)})"

# Utiliser le script d'entrée pour fixer les permissions puis démarrer
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
