# AluMg Devis (application Android locale)

Application Android **sans compte ni connexion** : devis, vue 3D, PDF personnalisé et partagé, gain par ouvrage et total, besoin en profilés, bon de commande et plan de coupe, prix au m² ou au mètre linéaire par type d'ouvrage, français et anglais, thème clair et sombre.

Elle sert d'essai : **14 jours** après le premier lancement (`TRIAL_DAYS` dans `lib/store.ts`), elle se bloque et renvoie vers l'inscription sur l'application web.

- Export statique de Next.js (`output: "export"`), qui réutilise `lib/` et `components/` du site (racine Turbopack = dépôt).
- Une seule page, navigation par l'ancre (`lib/route.ts`) : le serveur local de Capacitor ne sert que des fichiers.
- Données dans le téléphone (`localStorage`, `lib/store.ts`) : désinstaller l'application efface les devis.
- PDF : écrit dans le cache puis envoyé par la feuille de partage d'Android (`lib/share.ts`).
- Identifiant `mg.alumg.devis`, distinct de la coque en ligne `mg.alumg.app` (dossier `mobile/`). Même clé de signature, lue dans `mobile/keystore.properties`.

## Construire

    cd appli && npm install && ./build-apk.sh

Copie l'APK et son empreinte dans `public/downloads/` (page `/telecharger` du site). Développement dans un navigateur : `./node_modules/.bin/next dev appli` depuis la racine.
À chaque version diffusée, augmenter `versionCode` et `versionName` dans `android/app/build.gradle`.
