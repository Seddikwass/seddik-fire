# Déploiement, sauvegarde et mise à jour — SEDDIK LEAGUE

## 1. Service Render (en place)
| Élément | Valeur |
|---|---|
| Service | `football-tunisia-2026` (Web Service Node, région Frankfurt, plan Free) |
| URL publique | https://football-tunisia-2026.onrender.com |
| Dépôt / branche | `Seddikwass/seddik-fire`, branche **`football-tunisia-2026`** (projet séparé : aucune autre branche modifiée) |
| Build / démarrage | `npm install --omit=dev` / `node server.js` |
| Santé | `GET /api/health` → version, commit déployé, type de stockage, comptes actifs |
| Administration | `/admin.html` (jeton `ADMIN_TOKEN`) |

Chaque `git push` sur la branche redéploie automatiquement. Le plan Free s'endort après 15 min d'inactivité : le premier chargement peut prendre ~1 minute (le jeu affiche « serveur en veille, réessayez »).

## 2. Variables d'environnement
| Variable | Rôle | Où |
|---|---|---|
| `NODE_ENV` | `production` | défini |
| `SESSION_SECRET` | signature des jetons de session (HMAC) | défini (aléatoire, jamais dans le code) |
| `ADMIN_TOKEN` | accès au panneau d'administration | défini (communiqué au propriétaire uniquement) |
| `DB_SCHEMA` | schéma PostgreSQL dédié (`ft26`) — permet de partager une base sans toucher aux autres tables | défini |
| `DATABASE_URL` | **URL interne PostgreSQL** — active les comptes et la sauvegarde serveur | **À DÉFINIR** (voir §3) |
| `ALLOWED_ORIGINS` | origines web supplémentaires autorisées (CORS), séparées par des virgules | facultatif |

## 3. Base de données persistante (action requise)
Le compte Render possède déjà une base gratuite (`dafter-db`) et Render n'autorise qu'**une** base gratuite active ; de plus, les bases gratuites **expirent après 30 jours**. Pour des sauvegardes qui « survivent à un redémarrage » (exigence du cahier des charges), il faut une base **payante** :

1. Render → **New → PostgreSQL** → nom `football-tunisia-2026-db`, région **Frankfurt**, plan **Basic-256mb** (≈ 6 $/mois).
2. Ouvrir la base → **Connections** → copier l'**Internal Database URL**.
3. Service `football-tunisia-2026` → **Environment** → ajouter `DATABASE_URL` = l'URL copiée → **Save** (redéploiement automatique).
4. Vérifier : `https://football-tunisia-2026.onrender.com/api/health` doit afficher `"store":"postgres","persistent":true,"accounts":true`.

Les tables sont créées automatiquement au démarrage (migrations versionnées dans `lib/store.js`, table `schema_migrations`).
Tant que `DATABASE_URL` n'est pas défini, **les comptes en ligne sont désactivés** (message clair dans le jeu) et la carrière est sauvegardée sur l'appareil : le serveur ne prétend jamais conserver des données sur son disque éphémère.

## 4. Sauvegardes et restauration
- **Automatique (joueur)** : chaque décision importante sauvegarde localement ; avec un compte, envoi au serveur 2,5 s plus tard. Le serveur garde les **5 dernières révisions** par joueur (`save_history`), restaurables via `POST /api/save/restore`.
- **Conflits** : si le serveur a une version plus récente provenant d'un autre appareil, le jeu demande quelle version garder (aucun écrasement silencieux).
- **Hors ligne** : le jeu fonctionne sans réseau ; la synchronisation reprend au retour de la connexion.
- **Export complet (administrateur)** : `/admin.html` → « Exporter une sauvegarde complète » (comptes avec mots de passe hachés, sauvegardes, données). À faire chaque semaine.
- **Restauration** : `/admin.html` → « Restaurer » (fusion dans la base). Procédure en cas de perte : 1) créer une nouvelle base, 2) mettre à jour `DATABASE_URL`, 3) redéployer, 4) restaurer le dernier export.
- Render Basic inclut aussi des sauvegardes quotidiennes de la base (Point-in-time recovery selon le plan).

## 5. Journaux et surveillance
- Journaux JSON (une ligne par événement : démarrage, migrations, requêtes API avec statut et durée, erreurs, accès admin refusés) : Render → service → **Logs**.
- Vérification : `/api/health` (à brancher sur un moniteur externe type UptimeRobot si souhaité).
- Sécurité : mots de passe hachés **scrypt**, jetons signés HMAC (30 jours), limitation de débit (inscription/connexion, sauvegardes, admin), en-têtes de sécurité, aucun secret dans le code client.

## 6. Mise à jour
1. Modifier le code sur la branche `football-tunisia-2026` → `git push` → Render redéploie (le commit déployé apparaît dans `/api/health`).
2. Changer `APP_VERSION` (`public/js/app.js`), `version` (`package.json`, `android-app/package.json`) et la constante `V` de `public/sw.js` pour forcer la mise à jour hors ligne.
3. Les anciennes sauvegardes sont migrées par `migrate()` (`public/js/career.js`, champ `v`).
4. Données (clubs, stades, couleurs…) : `/admin.html`, sans redéploiement.
