# laut.fm Bot Template

Ein leistungsstarker und anpassbarer Discord-Bot, der es dir ermöglicht, Radiosender von laut.fm direkt in deinem Discord-Server abzuspielen. Mit Funktionen wie Senderauswahl, aktuellen Songs, Top-Sendern und mehr ist dieser Bot der perfekte Begleiter für musikalische Unterhaltung.

---

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Installation](#installation)
3. [Konfiguration](#konfiguration)
4. [Verfügbare Befehle](#verfügbare-befehle)
5. [Danksagung](#danksagung)

---

## 🛠 Voraussetzungen

Bevor du den Bot verwenden kannst, stelle sicher, dass du folgende Voraussetzungen erfüllst:

- **Node.js** (Version 16.9.0 oder höher)
- **npm** (Node Package Manager)
- Ein **Discord-Bot-Token** (erhältlich über das [Discord Developer Portal](https://discord.com/developers/applications))
- Zugriff auf die **laut.fm API**

---

## 🚀 Installation

1. **Repository herunterladen**  
   Lade das Projekt herunter oder klone es mit folgendem Befehl:
   ```bash
   git clone https://github.com/dein-repo/lautfm-bot-template.git
   ```

2. **Abhängigkeiten installieren**  
   Navigiere in das Projektverzeichnis und installiere die benötigten Pakete:
   ```bash
   cd laut.fm-bot-template
   npm install
   ```

3. **.env-Datei konfigurieren**  
   Erstelle eine `.env`-Datei im Projektverzeichnis und füge deine Konfigurationswerte hinzu:
   ```dotenv
   BOT_TOKEN=DeinDiscordBotToken
   EMBED_COLOR=1ED9B4
   WEBSITE_URL=https://laut.fm
   ```

4. **Bot starten**  
   Starte den Bot mit folgendem Befehl:
   ```bash
   node index.js
   ```

---

## ⚙️ Konfiguration

### `stations.json`
In der Datei `stations.json` kannst du die verfügbaren Radiosender konfigurieren. Jeder Sender benötigt eine `station_id`, einen `station_name` (laut.fm-Name) und eine `station_color` (HEX-Farbe). Beispiel:
```json
[
  {
    "station_id": 1,
    "station_name": "eins",
    "station_color": "#1ED9B4"
  },
  {
    "station_id": 2,
    "station_name": "zwei",
    "station_color": "#373B4B"
  }
]
```

### `.env`
Die `.env`-Datei enthält wichtige Umgebungsvariablen:
- `BOT_TOKEN`: Dein Discord-Bot-Token.
- `EMBED_COLOR`: Standardfarbe für Embeds (HEX-Farbcode ohne `#`).
- `WEBSITE_URL`: URL der Website, die im `/über`-Befehl angezeigt wird.

---

## 📜 Verfügbare Befehle

Hier ist eine Liste der wichtigsten Befehle, die der Bot unterstützt:

### 🎵 **Radio**
- **`/radio`**  
  Spielt eine ausgewählte Radiostation ab.  
  **Optionen:**  
  - `station`: Wähle eine Station aus der Liste.

### 🎶 **Jetzt**
- **`/jetzt`**  
  Zeigt den aktuell gespielten Song und die Anzahl der Zuhörer an.

### 📜 **Letzte Songs**
- **`/letztesongs`**  
  Zeigt die letzten 5 gespielten Songs der aktuellen Station an.

### 🏆 **Top**
- **`/top`**  
  Zeigt die Top 5 Sender basierend auf der höchsten Zuhörerzahl.

### 📋 **Stationen**
- **`/stationen`**  
  Zeigt eine Liste der verfügbaren Stationen in Seitenansicht.

### ❓ **Hilfe**
- **`/hilfe`**  
  Zeigt eine Liste aller verfügbaren Befehle.

### ℹ️ **Über**
- **`/über`**  
  Zeigt Informationen über den Bot an.

### ⏹ **Stop**
- **`/stop`**  
  Stoppt die Wiedergabe und verlässt den Sprachkanal.

---

## 💡 Hinweise

- Der Bot benötigt Berechtigungen, um Sprachkanälen beizutreten und Nachrichten zu senden. Stelle sicher, dass du ihm die entsprechenden Rechte gibst.
- Wenn der Bot keine Station abspielt, überprüfe die Konfiguration in der Datei `stations.json` und stelle sicher, dass die Station auf laut.fm existiert.

---

## 🙏 Danksagung

Ein großes Dankeschön an:

- **laut.fm** für die Erlaubnis, dieses Projekt zu erstellen und hochzuladen.
- **Discord** für die Plattform und die Möglichkeit, Bots zu entwickeln (auch wenn es manchmal anstrengend ist!).
- **Microsoft** für die Unterstützung durch GitHub Copilot.
- **Dich**, weil du dieses Projekt nutzt und unterstützt!

---

Viel Spaß mit deinem laut.fm-Bot! 🎉