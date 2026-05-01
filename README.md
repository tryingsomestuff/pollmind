# PollMind

Systeme interne de marche de prediction pour questions scientifiques et techniques.

## 🚀 Démarrage rapide

### Option 1 : Docker (recommandé)

```bash
# Construire et démarrer avec Docker Compose
docker compose up -d --build

# L'application sera accessible sur http://localhost:81
```

Pour Docker, il n'est pas necessaire d'executer `npm install` sur la machine hote avant le build. L'image copie `package.json` et `package-lock.json`, puis installe les dependances avec `npm ci --omit=dev` dans le conteneur.

Le prerequis cote depot est simplement d'avoir un `package-lock.json` present et a jour.

Voir [DOCKER.md](DOCKER.md) pour la documentation complete Docker.

### Option 2 : Installation locale (Node.js)

```bash
# Installer les dépendances
npm install

# Démarrer le serveur
npm start
```

Pour le developpement avec auto-reload :
```bash
npm run dev
```

## ⚙️ Configuration NPM Registry

Selon votre environnement, vous devez configurer le registry npm approprie :

### En dehors du reseau Michelin (usage public)

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

### Sur le reseau Michelin (reseau interne)

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

### Rebuild Docker apres changement de registry

Si vous changez de registry npm, il faut regenerer le `package-lock.json` avec npm sur la machine hote, puis rebuilder l'image Docker :

```bash
rm -rf node_modules package-lock.json
npm install
docker compose down
docker compose build --no-cache
docker compose up -d
```

Note importante : le `package-lock.json` contient les URL exactes des packages. Il doit etre regenere a chaque changement de registry, ainsi que le dossier `node_modules`.


## Configuration Apache Reverse Proxy

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

Important :
- Les slashes finaux (`/`) sont obligatoires dans les URLs `ProxyPass`
- Sans eux, Apache ne retire pas le prefixe `/pollmind` de l'URL avant de la transmettre au backend
- Le numero de port (81 dans cet exemple) doit correspondre au port expose dans `docker-compose.yml`

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

1. Accedez a `http://localhost:81` en Docker, ou `http://localhost:3000` en local
2. Créez un compte ou connectez-vous
3. Les admins peuvent créer des questions
4. Les participants peuvent parier avec leurs points (100 au départ)

## Fonctionnalites

- Authentification utilisateurs (admin/participant)
- Création de questions par les admins
- Marche de prediction multi-options avec LMSR
- Probabilites normalisees qui somment a 100 % par question
- Prix de transaction calcule a partir du cout marginal du marche
- Gestion automatique des points

## Systeme de cotation

PollMind utilise un market maker LMSR multi-options.

- Chaque question possede un parametre de liquidite `b` stocke dans `questions.liquidity_param`.
- La fonction de cout est : `C(q) = b * ln(sum_i exp(q_i / b))`.
- La probabilite affichee pour l'option `i` est : `p_i = exp(q_i / b) / sum_j exp(q_j / b)`.
- Lorsqu'un utilisateur depense un montant `x` sur une option, le serveur cherche la quantite de shares `Delta q` telle que `C(q + Delta q * e_i) - C(q) = x`.
- A la resolution, chaque winning share paie `1` point. Une mise gagnante rembourse donc `shares`, pas une fraction d'un pool.

Consequence directe :

- les probabilites affichees restent coherentes, meme avec plus de deux reponses ;
- un marche plus liquide bouge moins vite ;
- la perte theorique maximale du market maker est bornee par `b * ln(n)`, ou `n` est le nombre d'options.

Voir [PRICING_EXPLANATION.md](PRICING_EXPLANATION.md) pour les details mathematiques et des exemples de calcul.
