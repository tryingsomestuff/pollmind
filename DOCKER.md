# 🐳 Déploiement Docker - PollMind

## 🚀 Démarrage rapide

### Option 1 : Docker Compose (recommandé)

```bash
# Construire et démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

L'application sera accessible sur : **http://localhost:3000**

### Option 2 : Docker uniquement

```bash
# Construire l'image
docker build -t pollmind:latest .

# Créer un volume Docker pour persister la base de données
docker volume create pollmind-data

# Lancer le container
docker run -d \
  --name pollmind \
  -p 3000:3000 \
  -v pollmind-data:/app/data \
  -e SECRET_KEY=votre-secret-key-securisee \
  pollmind:latest

# Voir les logs
docker logs -f pollmind

# Arrêter et supprimer (le volume persiste)
docker stop pollmind && docker rm pollmind

# Pour supprimer aussi le volume (⚠️ perd toutes les données)
docker volume rm pollmind-data
```

## 📦 Ce qui est inclus

- ✅ Node.js 20 Alpine (image légère)
- ✅ Toutes les dépendances npm (sql.js, bcryptjs, express, etc.)
- ✅ Configuration de sécurité (utilisateur non-root)
- ✅ Healthcheck automatique
- ✅ Persistance de la base de données via volume

## 🔧 Configuration

### Variables d'environnement

```bash
# docker-compose.yml
environment:
  - NODE_ENV=production
  - PORT=3000
  - SECRET_KEY=changez-moi-en-production
```

### Personnaliser le port

```bash
# Dans docker-compose.yml
ports:
  - "8080:3000"  # Exposer sur le port 8080 au lieu de 3000
```

### Volumes persistants

La base de données SQLite est stockée dans un **volume Docker nommé** `pollmind-data` :

```yaml
volumes:
  pollmind-data:  # Volume Docker pour la persistance
    driver: local

services:
  pollmind:
    volumes:
      - pollmind-data:/app/data  # Monte le volume dans /app/data
```

**Avantages du volume Docker** :
- ✅ Persistance automatique (survit à `docker compose down`)
- ✅ Gestion par Docker (pas de conflits de permissions)
- ✅ Backups faciles avec `docker run`
- ⚠️ Supprimé uniquement avec `docker compose down -v`

## 🏗️ Build de production

### Construire l'image

```bash
docker build -t pollmind:1.0.0 .
```

### Optimisations incluses

- ✅ Image multi-stage (Alpine Linux)
- ✅ Dépendances production uniquement (`npm ci --only=production`)
- ✅ Utilisateur non-root (sécurité)
- ✅ Healthcheck automatique
- ✅ `.dockerignore` pour exclure fichiers inutiles

## 🔍 Commandes utiles

```bash
# Reconstruire après modification du code
docker-compose up -d --build

# Voir les logs en temps réel
docker-compose logs -f pollmind

# Entrer dans le container
docker-compose exec pollmind sh

# Vérifier l'état de santé
docker inspect pollmind | grep Health -A 10

# Nettoyer les ressources Docker
docker-compose down -v  # Attention : supprime aussi les volumes !
```

## 🌐 Déploiement en production

### Sur un serveur Linux

```bash
# 1. Installer Docker et Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. Cloner le projet
git clone <votre-repo> pollmind
cd pollmind

# 3. Configurer les variables d'environnement
cp .env.example .env
nano .env  # Modifier SECRET_KEY

# 4. Lancer
docker-compose up -d

# 5. Vérifier
curl http://localhost:3000
```

### Avec reverse proxy (Nginx)

```nginx
# /etc/nginx/sites-available/pollmind
server {
    listen 80;
    server_name pollmind.votredomaine.com;

    location / {
        proxy_pass http://localhost:3000\;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Sur AWS ECS / Azure Container Instances

```bash
# Pousser l'image vers un registry
docker tag pollmind:latest votre-registry/pollmind:latest
docker push votre-registry/pollmind:latest

# Déployer selon la plateforme
```

## 🔐 Sécurité

### À faire en production

1. **Changer le SECRET_KEY** :
   ```bash
   # Générer une clé sécurisée
   openssl rand -base64 32
   ```

2. **Variables d'environnement** :
   - Ne pas mettre de secrets dans `docker-compose.yml`
   - Utiliser un fichier `.env` (non versionné)

3. **HTTPS** :
   - Utiliser un reverse proxy (Nginx, Caddy, Traefik)
   - Obtenir un certificat SSL (Let's Encrypt)

4. **Firewall** :
   ```bash
   # N'exposer que le port nécessaire
   ufw allow 80/tcp
   ufw allow 443/tcp
   ```


## 💾 Gestion des données

### Vérifier le volume

```bash
# Lister les volumes
docker volume ls | grep pollmind

# Inspecter le volume
docker volume inspect pollmind_pollmind-data
```

### Backup de la base de données

```bash
# Sauvegarder les données
docker run --rm -v pollmind_pollmind-data:/data \
  -v $(pwd):/backup alpine \
  tar czf /backup/pollmind-backup-$(date +%Y%m%d).tar.gz -C /data .

# Liste les backups
ls -lh pollmind-backup-*.tar.gz
```

### Restaurer depuis un backup

```bash
# Créer un nouveau volume (si nécessaire)
docker volume create pollmind_pollmind-data

# Restaurer les données
docker run --rm -v pollmind_pollmind-data:/data \
  -v $(pwd):/backup alpine \
  sh -c "cd /data && tar xzf /backup/pollmind-backup-YYYYMMDD.tar.gz"

# Redémarrer l'application
docker compose restart
```

### Migrer vers un autre serveur

```bash
# Sur l'ancien serveur
docker run --rm -v pollmind_pollmind-data:/data \
  -v $(pwd):/backup alpine \
  tar czf /backup/migration.tar.gz -C /data .

# Transférer le fichier vers le nouveau serveur
scp migration.tar.gz user@nouveau-serveur:/path/to/pollmind/

# Sur le nouveau serveur
docker volume create pollmind_pollmind-data
docker run --rm -v pollmind_pollmind-data:/data \
  -v $(pwd):/backup alpine \
  sh -c "cd /data && tar xzf /backup/migration.tar.gz"
```

## 🐛 Troubleshooting

### Le container ne démarre pas

```bash
# Voir les logs d'erreur
docker-compose logs pollmind

# Vérifier la santé
docker ps -a
```

### Erreur de permissions sur la base de données

```bash
# Ajuster les permissions du dossier data
chmod 755 data
```

### Le port 3000 est déjà utilisé

```bash
# Changer le port dans docker-compose.yml
ports:
  - "8080:3000"
```

## 📊 Monitoring

### Logs en continu

```bash
docker-compose logs -f --tail=100
```

### Métriques du container

```bash
docker stats pollmind
```

### Healthcheck

```bash
# Le healthcheck vérifie que l'API répond
docker inspect pollmind | grep -A 5 Health
```

## 🎯 Résumé

**Avantages Docker pour PollMind :**
- ✅ Déploiement en une commande
- ✅ Pas de problèmes de dépendances natives (sql.js = WebAssembly)
- ✅ Portable (dev = prod)
- ✅ Isolation et sécurité
- ✅ Rollback facile (tags de version)
- ✅ Scalable (orchestration K8s si besoin futur)

**Un seul prérequis :** Docker installé 🐳
