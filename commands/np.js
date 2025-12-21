import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
  .setName('jetzt')
  .setDescription('Zeigt den aktuell gespielten Song und die Anzahl der Zuhörer an.');

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const serverInfo = serverData.get(interaction.guild.id);
  if (!serverInfo) {
    await interaction.editReply({ content: '❌ Es wird aktuell keine Station auf diesem Server abgespielt.', flags: 64 });
    log('warn', 'Kein aktiver Stream für den Server.', {
      server: { name: interaction.guild.name, id: interaction.guild.id },
      channel: { name: interaction.channel.name, id: interaction.channel.id }
    });
    return;
  }

  const station = serverInfo.station;

  try {
    const songApiUrl = `https://api.laut.fm/station/${station.station_name}/current_song`;
    const listenersApiUrl = `https://api.laut.fm/station/${station.station_name}/listeners`;
    const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;

    const [songResponse, listenersResponse, stationData] = await Promise.all([
      axios.get(songApiUrl),
      axios.get(listenersApiUrl),
      axios.get(stationApiUrl).then(res => res.data)
    ]);

    const currentSong = songResponse.data || { title: 'Unbekannt', artist: { name: 'Unbekannt' } };
    const listeners = listenersResponse.data || 0;

    const embed = new EmbedBuilder()
      .setTitle(`Du hörst ${stationData.display_name}`)
      .setDescription(stationData.description || 'Keine Beschreibung verfügbar.')
      .addFields(
        { name: 'Künstler', value: currentSong.artist.name || 'Unbekannt', inline: false },
        { name: 'Titel', value: currentSong.title || 'Unbekannt', inline: false },
        { name: 'Zuhörer', value: `${listeners}`, inline: false }
      )
      .setImage(stationData.images.station)
      .setColor(station.station_color);

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🌐 Zu laut.fm')
        .setStyle(ButtonStyle.Link)
        .setURL(stationData.page_url)
    );

    await interaction.editReply({ embeds: [embed], components: [button], flags: 64 });

    log('info', 'Aktueller Song abgerufen.', {
      server: { name: interaction.guild.name, id: interaction.guild.id },
      channel: { name: interaction.channel.name, id: interaction.channel.id },
      stream: { name: station.station_name, id: station.station_id }
    });
  } catch (error) {
    log('error', 'Fehler beim Abrufen der aktuellen Songdaten.', { error: error.message });
    await interaction.editReply({ content: '❌ Fehler beim Abrufen der aktuellen Songdaten oder Zuhörer. Bitte versuche es später erneut.', flags: 64 });
  }
}
