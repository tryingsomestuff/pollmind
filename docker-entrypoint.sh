#!/bin/sh
set -e

# Créer le répertoire data s'il n'existe pas
mkdir -p /app/data

# Fixer les permissions pour l'utilisateur nodejs (uid 1001)
chown -R nodejs:nodejs /app/data

# Passer à l'utilisateur nodejs et démarrer l'application
exec su -s /bin/sh nodejs -c 'node server.js'
