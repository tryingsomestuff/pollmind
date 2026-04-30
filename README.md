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


## 🌐 Configuration Apache Reverse Proxy

Pour exposer l'application via Apache sur un sous-chemin (ex: `https://votre-domaine.com/pollmind/`), suivez ces étapes :

### 1. Activer les modules Apache nécessaires

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl restart apache2
```

### 2. Configuration du VirtualHost HTTPS

Ajoutez ces lignes dans votre fichier VirtualHost SSL (généralement `/etc/apache2/sites-available/000-default-le-ssl.conf`) :

```apache
<VirtualHost *:443>
    ServerName votre-domaine.com
    
    # ... autres configurations SSL ...
    
    # Reverse proxy vers l'application Docker
    ProxyPass /pollmind/ http://localhost:81/
    ProxyPassReverse /pollmind/ http://localhost:81/
    
    # ... reste de la configuration ...
</VirtualHost>
```

**⚠️ Important :** 
- Les **slashes finaux** (`/`) sont obligatoires dans les URLs ProxyPass
- Sans eux, Apache ne retire pas le préfixe `/pollmind` de l'URL avant de la transmettre au backend
- Le numéro de port (81 dans cet exemple) doit correspondre au port exposé dans `docker-compose.yml`

### 3. Redémarrer Apache

```bash
sudo systemctl restart apache2
```

### 4. Configuration alternative : Sous-domaine

Si vous préférez utiliser un sous-domaine (ex: `pollmind.votre-domaine.com`) :

```apache
<VirtualHost *:443>
    ServerName pollmind.votre-domaine.com
    
    # ... configurations SSL ...
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:81/
    ProxyPassReverse / http://localhost:81/
    
    ErrorLog ${APACHE_LOG_DIR}/pollmind-error.log
    CustomLog ${APACHE_LOG_DIR}/pollmind-access.log combined
</VirtualHost>
```

Dans ce cas, vous n'avez **pas besoin** de modifier le code JavaScript (pas de détection de BASE_PATH nécessaire).

### 5. Vérification

Testez votre configuration :

```bash
# Vérifier la syntaxe Apache
sudo apache2ctl configtest

# Si OK, redémarrer
sudo systemctl restart apache2

# Vérifier les logs en cas d'erreur
sudo tail -f /var/log/apache2/error.log
```

### Mapping des ports

L'application Node.js écoute toujours sur le port 3000 **à l'intérieur** du conteneur Docker :
- `docker-compose.yml` mappe `81:3000` → accessible sur `localhost:81` depuis l'hôte
- Apache proxy `votre-domaine.com/pollmind/` → `localhost:81`
- Le client accède via `https://votre-domaine.com/pollmind/`

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
