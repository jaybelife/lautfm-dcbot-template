import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import serverData from '../serverData.js';
import { log } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stations = JSON.parse(fs.readFileSync(path.join(__dirname, '../stations.json'), 'utf-8'));

export const data = new SlashCommandBuilder()
  .setName('letztesongs')
  .setDescription('Zeigt die letzten 5 gespielten Songs der aktuellen Station an.');

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const serverInfo = serverData.get(interaction.guild.id);
  if (!serverInfo) {
    await interaction.editReply({ content: '❌ Es wird aktuell keine Station auf diesem Server abgespielt.', flags: 64 });
    log('warn', 'Kein aktiver Stream für den Server.', { server: interaction.guild.name });
    return;
  }

  const station = serverInfo.station;

  try {
    // Abrufen der API-Daten für die Station
    const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;
    const lastSongsApiUrl = `${stationApiUrl}/last_songs`;

    const [stationData, lastSongsResponse] = await Promise.all([
      axios.get(stationApiUrl).then(res => res.data),
      axios.get(lastSongsApiUrl).then(res => res.data)
    ]);

    const lastSongs = lastSongsResponse.slice(0, 5);

    if (!lastSongs || lastSongs.length === 0) {
      await interaction.editReply({ content: '❌ Keine letzten Songs gefunden.', flags: 64 });
      log('warn', 'Keine letzten Songs gefunden.', { station: station.station_name });
      return;
    }

    // Erstellen des Embeds mit den letzten Songs
    const embed = new EmbedBuilder()
      .setTitle(`Letzte 5 Songs von ${stationData.display_name}`) // display_name aus der API
      .setColor(station.station_color);

    lastSongs.forEach(song => {
      const startedAt = new Date(song.started_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      embed.addFields({
        name: `${startedAt} - ${song.artist.name || 'Unbekannt'}`,
        value: `${song.title || 'Unbekannt'}`,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed], flags: 64 });

    // Loggt die erfolgreiche Ausführung des Befehls
    log('info', 'Liste der letzten Songs abgerufen.', {
      server: { name: interaction.guild.name, id: interaction.guild.id },
      channel: { name: interaction.channel.name, id: interaction.channel.id },
      stream: { name: station.station_name, id: station.station_id }
    });
  } catch (error) {
    log('error', 'Fehler beim Abrufen der letzten Songs.', { error: error.message });
    await interaction.editReply({ content: '❌ Fehler beim Abrufen der letzten Songs. Bitte später erneut versuchen.', flags: 64 });
  }
}
