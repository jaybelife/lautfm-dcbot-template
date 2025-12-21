Hallo zusammen,

ich freue mich, die Beta-Phase meines **laut.fm Discord-Bot Templates (Version 1)** anzukündigen!  
Dieses Template dient als Grundgerüst, um euren eigenen Discord-Bot mit laut.fm-Funktionen zu erstellen und nach Belieben anzupassen.

---

## 🔹 Funktionen

Das Template bietet aktuell folgende Features:

- **Radio starten**: Spiele eine ausgewählte Radiostation direkt im Sprachkanal ab.
- **Letzte Songs ansehen**: Zeige die letzten 5 gespielten Songs einer Radiostation an.
- **Aktuell gespielte Musikdaten abrufen**: Zeige den aktuell gespielten Song (Künstler & Titel) und die Zuhörerzahl an.
- **Weitere praktische Funktionen**: Unterstützung für Slash Commands, dynamische Stationen und mehr.

---

## 🔹 Schnellstart-Anleitung

### 1. Repository herunterladen
Lade das Repository von GitHub herunter:  
[laut.fm Discord-Bot Template](https://github.com/jaybelife/lautfm-dcbot-template)  
Entpacke das ZIP-Archiv und öffne den Ordner in **Visual Studio Code** oder einem anderen Editor.

### 2. Abhängigkeiten installieren
Öffne ein Terminal im Projektordner und führe den folgenden Befehl aus:
```bash
npm install
```
Damit werden alle benötigten Pakete für den Bot installiert.

### 3. Konfiguration anpassen
#### 3.1 `stations.json` bearbeiten
Passe die Datei `stations.json` an, um deine bevorzugten Radiostationen hinzuzufügen. Beispiel:
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
**Bedenke:** Discord kann nur eine gewisse Anzahl an Stationen anzeigen. Empfohlen: maximal 14 Stationen.

#### 3.2 `.env`-Datei erstellen
Erstelle eine `.env`-Datei im Hauptverzeichnis und trage deinen Discord-Bot-Token sowie weitere Konfigurationswerte ein:
```env
BOT_TOKEN=DEIN_BOT_TOKEN
EMBED_COLOR=DEINE_FARBE
WEBSITE_URL=DEINE_WEBSITE
```

### 4. Bot starten
Starte den Bot mit folgendem Befehl:
```bash
npm start
```
Der Bot sollte nun online gehen und die konfigurierten Stationen anzeigen.

### 5. Spaß haben
Dein Bot ist jetzt einsatzbereit! Teste ihn auf deinem Discord-Server und genieße deine eigene laut.fm-Integration. 🎉

---

## 🔹 Verwendung

1. **Bot starten**:  
   Starte den Bot mit:
   ```bash
   npm start
   ```

2. **Befehle im Discord-Server nutzen**:  
   - `/radio`: Spiele eine Radiostation ab.
   - `/letztesongs`: Zeige die letzten 5 gespielten Songs an.
   - `/jetzt`: Zeige den aktuell gespielten Song und die Zuhörerzahl an.
   - Weitere Befehle wie `/hilfe`, `/stop` und `/stationen`.

---

## 🔹 Hinweise & Nutzung

- Die Nutzung erfolgt auf eigenes Risiko.  
- Ich übernehme keine Haftung für fehlerhafte Nutzung.  
- Feedback, Fragen oder Feature-Wünsche können gerne im [Forumthread](https://forum.laut.fm) gepostet werden.
- **Die Nutzung ist aktuell nur auf einen Discord-Server beschränkt.** Bitte halte dich an diese Vorgabe.
- **Mit der Nutzung des Templates stimmst du den Nutzungsbedingungen zu.**

---

## ⚠️ Wichtige Hinweise zur Veröffentlichung

- Das Template (Grundgerüst) darf **nicht modifiziert erneut veröffentlicht** werden.  
- Das Template (Grundgerüst) darf **nicht unverändert erneut veröffentlicht** werden.  
- **Ausnahme**: Nur mit meiner schriftlichen Erlaubnis.

---

Ich bin gespannt auf euer Feedback und freue mich auf eure Erfahrungen mit dem Template! 🚀
