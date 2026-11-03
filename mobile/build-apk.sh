#!/usr/bin/env bash
# Construit l'APK signé d'AluMg et le copie dans public/downloads/ (servi par le site, page /telecharger).
# Prérequis : JDK 17 ou 21, SDK Android (API 35), mobile/keystore.properties + mobile/alumg-release.keystore (jamais versionnés).
set -euo pipefail
cd "$(dirname "$0")"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
[ -f keystore.properties ] || { echo "keystore.properties introuvable : la version signée ne peut pas être construite" >&2; exit 1; }
npx cap sync android
(cd android && ./gradlew --no-daemon assembleRelease)
mkdir -p ../public/downloads
cp android/app/build/outputs/apk/release/app-release.apk ../public/downloads/AluMg.apk
ls -l ../public/downloads/AluMg.apk
# empreinte publiée à côté du fichier (lien « Empreinte SHA-256 » de la page /telecharger)
(cd ../public/downloads && shasum -a 256 AluMg.apk > AluMg.apk.sha256 && cat AluMg.apk.sha256)
