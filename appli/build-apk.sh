#!/usr/bin/env bash
# Construit l'APK signé d'AluMg Devis (application locale) : export statique de appli/, puis coque Capacitor.
# Prérequis : JDK 17 ou 21, SDK Android (API 34), npm install dans ce dossier, la clé de signature de mobile/ (jamais versionnée).
set -euo pipefail
cd "$(dirname "$0")"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
[ -f ../mobile/keystore.properties ] || { echo "mobile/keystore.properties introuvable : la version signée ne peut pas être construite" >&2; exit 1; }
(cd .. && ./node_modules/.bin/next build appli)
npx cap sync android
(cd android && ./gradlew --no-daemon assembleRelease)
# servi par le site (page /telecharger), avec son empreinte
mkdir -p ../public/downloads
cp android/app/build/outputs/apk/release/app-release.apk ../public/downloads/AluMg-Devis.apk
ls -l ../public/downloads/AluMg-Devis.apk
(cd ../public/downloads && shasum -a 256 AluMg-Devis.apk > AluMg-Devis.apk.sha256 && cat AluMg-Devis.apk.sha256)
