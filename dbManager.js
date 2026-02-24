import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { onair: {} };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getOnAirConfig(guildId) {
  const db = readDB();
  return db.onair[guildId] || null;
}

export function setOnAirVoiceChannel(guildId, channelId) {
  const db = readDB();
  if (!db.onair[guildId]) {
    db.onair[guildId] = {};
  }
  db.onair[guildId].voiceChannelId = channelId;
  writeDB(db);
}

export function setOnAirStation(guildId, stationId) {
  const db = readDB();
  if (!db.onair[guildId]) {
    db.onair[guildId] = {};
  }
  db.onair[guildId].stationId = stationId;
  writeDB(db);
}

export function deleteOnAirConfig(guildId) {
  const db = readDB();
  if (db.onair[guildId]) {
    delete db.onair[guildId];
    writeDB(db);
  }
}

export function getAllOnAirConfigs() {
  const db = readDB();
  return db.onair;
}
