import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import serverData from '../serverData.js';
import { log } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stations = JSON.parse(fs.readFileSync(path.join(__dirname, '../stations.json'), 'utf-8'));

async function fetchStationDisplayNames() {
  const stationChoices = await Promise.all(
    stations.map(async (station) => {
      try {
        const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;
        const stationData = await axios.get(stationApiUrl).then(res => res.data);

        return {
          name: stationData.display_name,
          value: station.station_id.toString()
        };
      } catch (error) {
        log('error', `Fehler beim Abrufen des Displaynamens für ${station.station_name}.`, { error: error.message });
        return {
          name: station.station_name,
          value: station.station_id.toString()
        };
      }
    })
  );

  return stationChoices;
}

const stationChoices = await fetchStationDisplayNames();

export const data = new SlashCommandBuilder()
  .setName('radio')
  .setDescription('Spielt eine ausgewählte Radiostation ab.')
  .addStringOption(option =>
    option
      .setName('station')
      .setDescription('Wähle eine Radiostation aus')
      .setRequired(true)
      .addChoices(...stationChoices)
  );

function monitorChannel(connection, channel, guildId) {
  const interval = setInterval(() => {
    if (channel.members.filter(member => !member.user.bot).size === 0) {
      connection.destroy();
      serverData.delete(guildId);
      clearInterval(interval);
      log('info', `Bot hat den Kanal verlassen, da keine Benutzer mehr anwesend sind.`, {
        channel: channel.name,
        guild: channel.guild.name
      });
    }
  }, 10_000);
}

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const stationId = parseInt(interaction.options.getString('station'));
  const station = stations.find(s => s.station_id === stationId);

  if (!station) {
    await interaction.editReply({ content: '❌ Station nicht gefunden.', flags: 64 });
    log('warn', 'Station nicht gefunden.', { stationId });
    return;
  }

  const channel = interaction.member.voice.channel;
  if (!channel) {
    await interaction.editReply({ content: '❌ Du musst dich in einem Sprachkanal befinden, um eine Radiostation abspielen zu können.', flags: 64 });
    log('warn', 'Benutzer ist nicht in einem Sprachkanal.', { user: interaction.user.username });
    return;
  }

  try {
    if (serverData.has(interaction.guild.id)) {
      const existingData = serverData.get(interaction.guild.id);
      existingData.connection.destroy();
      serverData.delete(interaction.guild.id);
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    const player = createAudioPlayer();

    const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;
    const stationData = await axios.get(stationApiUrl).then(res => res.data);

    const streamUrl = `${stationData.stream_url}?ref=discord_bot&bot_id=${interaction.client.user.id}`;
    const stationLogo = stationData.images?.station || null;
    const stationDescription = stationData.description || null;
    const stationPageUrl = stationData.page_url || null;

    const resource = createAudioResource(streamUrl, { inlineVolume: true });
    resource.volume.setVolume(0.5);
    player.play(resource);
    connection.subscribe(player);

    serverData.set(interaction.guild.id, { connection, station, player });

    monitorChannel(connection, channel, interaction.guild.id);

    const apiUrl = `https://api.laut.fm/station/${station.station_name}/current_song`;
    const response = await axios.get(apiUrl);
    const currentSong = response.data || { title: 'Unbekannt', artist: { name: 'Unbekannt' } };

    const embed = new EmbedBuilder()
      .setTitle(`Du hörst ${stationData.display_name}`)
      .setColor(station.station_color);

    if (stationDescription) {
      embed.setDescription(stationDescription);
    }
    if (currentSong.artist?.name) {
      embed.addFields({ name: 'Künstler', value: currentSong.artist.name, inline: false });
    }
    if (currentSong.title) {
      embed.addFields({ name: 'Titel', value: currentSong.title, inline: false });
    }
    if (stationLogo) {
      embed.setImage(stationLogo);
    }

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🌐 Zu laut.fm')
        .setStyle(ButtonStyle.Link)
        .setURL(stationPageUrl || 'https://laut.fm')
    );

    await interaction.editReply({ embeds: [embed], components: [button], flags: 64 });

    log('success', 'Radio gestartet.', {
      server: { name: interaction.guild.name, id: interaction.guild.id },
      channel: { name: channel.name, id: channel.id },
      stream: { name: station.station_name, id: station.station_id }
    });
  } catch (error) {
    log('error', 'Fehler beim Beitreten des Sprachkanals.', { error: error.message });
    await interaction.editReply({ content: '❌ Fehler beim Beitreten des Sprachkanals. Bitte versuche es später erneut.', flags: 64 });
  }
}
