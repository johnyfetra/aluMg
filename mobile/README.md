# AluMg pour Android

Coque Android (Capacitor 6) : une activité qui ouvre le site `https://alumg.vercel.app` dans un WebView. Le backend et l'API sont ceux du site (`/api/*`, session par cookie) : rien n'est dupliqué dans l'application, et les nouveautés du site arrivent sans nouvelle version de l'APK.

- `www/index.html` : écran de démarrage embarqué (vérifie la version du WebView et la connexion, puis ouvre le site). ES5 seulement, il doit tourner sur un vieux WebView.
- `android/` : projet Gradle généré par Capacitor, puis adapté (icône, permissions, signature, SDK).
- Compatibilité : Android 5.1 et plus (`minSdk 22`). Le site lui-même demande un WebView Chrome 111 ou plus (Tailwind v4) : en dessous, l'application propose de mettre à jour « Android System WebView ».

## Construire l'APK

Prérequis : JDK 17 ou 21, SDK Android avec l'API 35, `npm install` dans ce dossier, la clé de signature (voir ci-dessous).

    cd mobile && npm install && ./build-apk.sh

Le script synchronise Capacitor, construit la version signée et copie `AluMg.apk` et son empreinte `AluMg.apk.sha256` dans `public/downloads/` (page `/telecharger`).

À chaque nouvelle version diffusée :

1. augmenter `versionCode` (obligatoire : Android refuse une mise à jour dont le code n'augmente pas) et `versionName` dans `android/app/build.gradle` ;
2. mettre à jour la version et la taille affichées (`apkMeta` dans `lib/marketing.ts`) ;
3. construire, tester l'installation sur un téléphone, puis commiter l'APK.

## Clé de signature : à ne jamais perdre, à ne jamais versionner

`alumg-release.keystore` et `keystore.properties` sont dans `.gitignore`. Android n'installe une mise à jour que si elle est signée par la **même** clé : sans elle, les utilisateurs devraient désinstaller l'application et perdre ses données locales.

- Une copie est gardée hors du dépôt. Elle doit aussi être rangée dans un gestionnaire de mots de passe ou un coffre chiffré.
- Empreinte SHA-256 du certificat (publique, sert à vérifier qu'on a la bonne clé) :
  `09:AA:F4:62:5A:75:5D:C1:0C:42:A4:21:D0:C6:F6:BF:78:57:9E:60:53:ED:48:E2:3C:BC:C8:4D:2B:4C:55:D1`
- Restaurer sur une autre machine : remettre les deux fichiers dans ce dossier. Vérifier avec
  `keytool -list -v -keystore alumg-release.keystore` que l'empreinte est la même.
- Pour construire en CI : encoder le keystore en base64 dans un secret, le décoder au moment du build, ne jamais l'afficher dans les journaux.

## Limites connues (shortcut)

- L'APK est versionné dans `public/downloads/` : simple, mais le dépôt grossit de ~3 Mo à chaque version. Au-delà de quelques versions, passer à une release GitHub ou à un stockage d'objets.
- Distribution hors Play Store (installation manuelle, « sources inconnues »). Pour le Play Store : publier un AAB (`./gradlew bundleRelease`), avec `targetSdk` à jour.
- Android 7.0 et avant : la chaîne de certificats HTTPS du site peut ne pas être reconnue par le téléphone ; non testé sur appareil.
