# Cyber Arena Android App

Dieses Projekt wurde mit Capacitor vorbereitet, damit du es direkt in Android Studio öffnen kannst.

## Voraussetzungen
- Android Studio (neueste Version empfohlen)
- Node.js und npm (hast du bereits, wenn du das Projekt hier bearbeitest)

## Anleitung zum Öffnen in Android Studio
1. Lade die ZIP-Datei dieses Projekts herunter.
2. Entpacke die ZIP-Datei auf deinem Computer.
3. Öffne Android Studio.
4. Wähle **"Open an existing project"** (oder "File" -> "Open").
5. Navigiere zum entpackten Ordner und wähle den Unterordner **`android`** aus.
6. Android Studio wird das Projekt laden und die notwendigen Gradle-Abhängigkeiten herunterladen.

## Fehlerbehebung (wenn Gradle nicht funktioniert)
Wenn Android Studio Fehler beim Laden des Projekts anzeigt (z.B. "Gradle sync failed"):

1. **Java-Version prüfen**: Capacitor 6+ benötigt mindestens **Java 17**. Gehe in Android Studio zu `Settings` -> `Build, Execution, Deployment` -> `Build Tools` -> `Gradle` und stelle sicher, dass bei **"Gradle JDK"** Java 17 oder höher ausgewählt ist.
2. **SDK-Versionen**: Ich habe die SDK-Version auf 35 (Android 15) eingestellt. Stelle sicher, dass du das Android SDK 35 in Android Studio installiert hast (`Tools` -> `SDK Manager`).
3. **Projekt synchronisieren**: Klicke oben rechts auf das Elefanten-Symbol mit dem blauen Pfeil (**"Sync Project with Gradle Files"**).
4. **Clean & Rebuild**: Gehe zu `Build` -> `Clean Project` und danach zu `Build` -> `Rebuild Project`.
5. **Internetverbindung**: Gradle muss beim ersten Mal viele Dateien herunterladen. Stelle sicher, dass du eine stabile Internetverbindung hast.

## App bauen und auf dem Handy testen
1. Verbinde dein Android-Handy per USB (Entwicklermodus und USB-Debugging müssen aktiviert sein).
2. Klicke in Android Studio auf den grünen **"Run"** Button (Play-Symbol).

## Änderungen am Spiel übernehmen
Wenn du den Code im Web-Teil (`src` Ordner) änderst und diese Änderungen in die Android-App übernehmen willst:
1. Führe im Hauptverzeichnis des Projekts aus:
   ```bash
   npm run build
   npx cap sync
   ```
2. Baue die App in Android Studio erneut.

Viel Spaß mit deiner eigenen App!
