import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../logger.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stations = JSON.parse(fs.readFileSync(path.join(__dirname, '../stations.json'), 'utf-8'));

export const data = new SlashCommandBuilder()
  .setName('top')
  .setDescription('Zeigt die Top 5 Sender basierend auf der höchsten Zuhörerzahl.');

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    const listenerData = await Promise.all(
      stations.map(async (station) => {
        const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;
        const stationData = await axios.get(stationApiUrl).then(res => res.data);

        const listenersApiUrl = `https://api.laut.fm/station/${station.station_name}/listeners`;
        const listeners = await axios.get(listenersApiUrl).then(res => res.data);

        return {
          station_display_name: stationData.display_name,
          listeners,
          station_color: station.station_color
        };
      })
    );

    const topStations = listenerData
      .sort((a, b) => b.listeners - a.listeners)
      .slice(0, 5);

    const embed = new EmbedBuilder()
      .setTitle('🏆 Top 5 Sender')
      .setColor(process.env.EMBED_COLOR || '#FFFFFF'); // Farbe aus der .env-Datei

    topStations.forEach((station, index) => {
      embed.addFields({
        name: `#${index + 1} ${station.station_display_name}`,
        value: `Zuhörer: ${station.listeners}`,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed], flags: 64 });

    log('info', 'Top-Sender-Befehl ausgeführt.', {
      command: 'top',
      server: { name: interaction.guild.name, id: interaction.guild.id },
      channel: { name: interaction.channel.name, id: interaction.channel.id }
    });
  } catch (error) {
    log('error', 'Fehler beim Abrufen der Top-Sender.', { error: error.message });
    await interaction.editReply({ content: '❌ Fehler beim Abrufen der Top-Sender. Bitte versuche es später erneut.', flags: 64 });
  }
}
