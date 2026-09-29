# SENDAMhub LS Board

Tableau de bord web pour les opérations logistiques SENDAMhub : colis, collectes, transport, flotte, facturation, commissions, catalogue et notifications. Le projet utilise Next.js 16, React, TypeScript, Tailwind CSS et l'API de livraison SENDAM.

L'application est conçue pour être hébergée sur un VPS Linux derrière Nginx. Deux modes sont fournis : Docker Compose (recommandé) et Node.js avec systemd.

## Prérequis locaux

- Node.js 22 LTS ;
- Corepack activé (`corepack enable`) pour installer pnpm 11.1.2 ;
- accès à l'API de livraison ;
- un projet Firebase si les notifications push web sont utilisées.

```powershell
corepack enable
pnpm install --frozen-lockfile
Copy-Item .env.local.template .env.local
pnpm dev
```

L'application locale est disponible sur `http://localhost:3000`. Le backend de test autorise cette origine ; conserver le port 3000 pour les tests connectés à ce backend.

## Variables d'environnement

En local, créer `.env.local` depuis `.env.local.template`. Sur le VPS, créer `.env.production` depuis `.env.production.template`. Ces deux fichiers sont ignorés par Git.

| Variable | Requise | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Oui | URL HTTPS publique de l'API, sans `/` final. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Push web | Clé de configuration Firebase Web. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Push web | Domaine Firebase Auth. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Push web | Identifiant du projet Firebase. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Recommandée avec Firebase | Bucket Firebase. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Push web | Identifiant expéditeur FCM. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Push web | Identifiant de l'application Web Firebase. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Non | Mesure Firebase Analytics, si activée. |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Push web | Clé publique VAPID pour les notifications navigateur. |
| `NEXT_PUBLIC_CARTO_BASEMAP_KEY` | Non | Clé Carto pour la carte géographique. |
| `APP_PORT` | Docker seulement | Port local du VPS exposé à Nginx, par défaut `3000`. |

Tout nom qui commence par `NEXT_PUBLIC_` est intégré au JavaScript remis au navigateur pendant le build. Ces valeurs ne doivent jamais contenir de secret (mot de passe, jeton Bearer, clé privée ou chaîne de connexion). Les paramètres Firebase Web et VAPID sont des paramètres publics ; les clés serveur Firebase restent exclusivement côté backend.

Important : toute modification d'une variable `NEXT_PUBLIC_*` impose une reconstruction de l'image Docker ou un nouveau `pnpm build` en mode Node.js.

## Déploiement Docker Compose (recommandé)

### Préparer le VPS

Le VPS doit avoir Docker Engine, le plugin Docker Compose, Git et Nginx. Sur Debian/Ubuntu, installer Docker depuis son dépôt officiel puis vérifier :

```bash
docker --version
docker compose version
git --version
```

Cloner le dépôt, créer le fichier de production, puis renseigner les valeurs :

```bash
sudo mkdir -p /opt/sendamhub-ls-board
sudo chown "$USER":"$USER" /opt/sendamhub-ls-board
git clone <URL_DU_DEPOT> /opt/sendamhub-ls-board
cd /opt/sendamhub-ls-board
cp .env.production.template .env.production
nano .env.production
chmod 600 .env.production
```

Le premier lancement construit et démarre le conteneur :

```bash
bash scripts/deploy-docker.sh
```

Le script vérifie le fichier d'environnement, valide la configuration Compose, reconstruit l'image avec les valeurs publiques, démarre le service et attend l'état `healthy`.

Pour publier une nouvelle version sur le VPS :

```bash
cd /opt/sendamhub-ls-board
git pull --ff-only
bash scripts/deploy-docker.sh
```

Depuis un poste Windows, le script [scripts/deploy.ps1](scripts/deploy.ps1) déclenche ces deux commandes à distance après connexion SSH :

```powershell
.\scripts\deploy.ps1 `
  -VpsHost 203.0.113.10 `
  -VpsUser deploy `
  -VpsPath /opt/sendamhub-ls-board `
  -Mode docker
```

Le dépôt doit avoir été cloné une première fois sur le VPS et la clé SSH du poste doit être autorisée. Le script ne copie aucun fichier d'environnement : `.env.production` reste uniquement sur le serveur.

### Nginx et HTTPS

Le conteneur écoute uniquement sur `127.0.0.1:3000`; il n'est pas directement exposé à Internet. Copier [deploy/nginx/sendamhub-ls-board.conf](deploy/nginx/sendamhub-ls-board.conf) vers `/etc/nginx/sites-available/sendamhub-ls-board`, remplacer `{{DOMAIN}}` par le domaine du tableau de bord, puis activer la configuration :

```bash
sudo ln -s /etc/nginx/sites-available/sendamhub-ls-board /etc/nginx/sites-enabled/sendamhub-ls-board
sudo nginx -t
sudo systemctl reload nginx
```

Configurer ensuite TLS avec Certbot :

```bash
sudo certbot --nginx -d dashboard.example.com
```

Ajouter `https://dashboard.example.com` aux origines CORS autorisées du backend. Une URL HTTPS est indispensable aux notifications push et au service worker.

### Exploitation Docker

```bash
# État et journaux
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --follow app

# Arrêt volontaire
docker compose --env-file .env.production down

# Vérification applicative depuis le VPS
curl -I http://127.0.0.1:3000/login
```

## Déploiement Node.js + systemd

Ce mode est utile lorsque Docker n'est pas souhaité. Installer Node.js 22, Corepack, pnpm, Git et Nginx sur le VPS. Créer également un utilisateur système `sendamhub`, cloner le dépôt dans `/opt/sendamhub-ls-board`, puis créer `.env.production` comme dans la procédure Docker.

Installer le service systemd à partir de [deploy/systemd/sendamhub-ls-board.service](deploy/systemd/sendamhub-ls-board.service). Remplacer les deux occurrences de `{{APP_DIR}}` par `/opt/sendamhub-ls-board`, puis exécuter :

```bash
sudo cp deploy/systemd/sendamhub-ls-board.service /etc/systemd/system/sendamhub-ls-board.service
sudo systemctl daemon-reload
sudo systemctl enable sendamhub-ls-board
```

Pour construire puis relancer l'application :

```bash
cd /opt/sendamhub-ls-board
bash scripts/deploy-vps.sh
```

Le script installe les dépendances verrouillées, lance ESLint et TypeScript, effectue le build de production, puis redémarre `sendamhub-ls-board`. La même configuration Nginx et CORS que pour Docker est nécessaire. Depuis Windows, utiliser `-Mode native` avec `scripts/deploy.ps1`.

## Commandes de développement et qualité

| Commande | Rôle |
| --- | --- |
| `pnpm dev` | Serveur de développement. |
| `pnpm lint` | Contrôle ESLint. |
| `pnpm exec tsc --noEmit` | Vérification TypeScript. |
| `pnpm build` | Build de production. |
| `pnpm start` | Démarre le build produit par Next.js. |
| `pnpm test:e2e` | Tests Playwright. |

Le workflow GitHub Actions lance lint, TypeScript, build et les tests de fumée à chaque pull request et envoi sur `main`. Les tests n'utilisent pas de compte backend de production.

## Architecture

- `app/` : routes Next.js ;
- `components/` : composants et vues métier ;
- `lib/` : client API, authentification, Firebase et utilitaires ;
- `public/locales/` : traductions ;
- `scripts/` : scripts de déploiement VPS ;
- `deploy/` : modèles Nginx et systemd ;
- `tests/e2e/` : tests Playwright.

## Dépannage

- **Le conteneur ne devient pas healthy** : exécuter `docker compose --env-file .env.production logs app` et contrôler `NEXT_PUBLIC_API_BASE_URL`.
- **Erreur CORS** : autoriser l'URL HTTPS exacte du frontend sur le backend, sans oublier un éventuel domaine `www`.
- **Connexion ou données absentes** : vérifier que l'API est accessible depuis le navigateur et que l'URL définie lors du build est correcte.
- **Notifications push indisponibles** : vérifier les variables Firebase et VAPID, l'autorisation navigateur, le domaine configuré dans Firebase et HTTPS.
- **Échec de `git pull --ff-only`** : le dépôt sur le VPS a des modifications locales. Les examiner avec `git status`, les sauvegarder ou les annuler intentionnellement, puis relancer.

## Sécurité

Ne versionnez jamais `.env.production`, des jetons ou clés privées. Restreindre SSH aux clés, laisser seulement 80/443 accessibles publiquement, garder le port 3000 lié à `127.0.0.1`, et mettre à jour régulièrement le système, Docker et les dépendances applicatives.
