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

export const data = new SlashCommandBuilder()
  .setName('zufall')
  .setDescription('Spielt eine zufällige Radiostation im Sprachkanal ab.');

function monitorChannel(connection, channel, guildId) {
  const interval = setInterval(() => {
    if (channel.members.filter(member => !member.user.bot).size === 0) {
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
      }
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

  const userChannel = interaction.member.voice.channel;
  if (!userChannel) {
    await interaction.editReply({ content: '❌ Du musst dich in einem Sprachkanal befinden, um diesen Befehl zu verwenden.', flags: 64 });
    log('warn', 'Benutzer ist nicht in einem Sprachkanal.', { user: interaction.user.username });
    return;
  }

  const randomStation = stations[Math.floor(Math.random() * stations.length)];

  try {
    if (serverData.has(interaction.guild.id)) {
      const existingData = serverData.get(interaction.guild.id);
      if (existingData.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        existingData.connection.destroy();
      }
      serverData.delete(interaction.guild.id);
    }

    const connection = joinVoiceChannel({
      channelId: userChannel.id,
      guildId: userChannel.guild.id,
      adapterCreator: userChannel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    const player = createAudioPlayer();

    const stationApiUrl = `https://api.laut.fm/station/${randomStation.station_name}`;
    const stationData = await axios.get(stationApiUrl).then(res => res.data);

    const streamUrl = `${stationData.stream_url}?ref=discord_bot&bot_id=${interaction.client.user.id}`;
    const stationLogo = stationData.images?.station || null;
    const stationDescription = stationData.description || null;
    const stationPageUrl = stationData.page_url || null;

    const resource = createAudioResource(streamUrl, { inlineVolume: true });
    resource.volume.setVolume(0.5);
    player.play(resource);
    connection.subscribe(player);

    serverData.set(interaction.guild.id, { connection, station: randomStation, player });

    monitorChannel(connection, userChannel, interaction.guild.id);

    const songApiUrl = `https://api.laut.fm/station/${randomStation.station_name}/current_song`;
    const listenersApiUrl = `https://api.laut.fm/station/${randomStation.station_name}/listeners`;

    const [songResponse, listenersResponse] = await Promise.all([
      axios.get(songApiUrl),
      axios.get(listenersApiUrl)
    ]);

    const currentSong = songResponse.data || { title: 'Unbekannt', artist: { name: 'Unbekannt' } };
    const listeners = listenersResponse.data || 0;

    const embed = new EmbedBuilder()
      .setTitle(`Du hörst ${stationData.display_name}`)
      .setColor(randomStation.station_color);

    if (stationDescription) {
      embed.setDescription(stationDescription);
    }
    if (currentSong.artist?.name) {
      embed.addFields({ name: 'Künstler', value: currentSong.artist.name, inline: false });
    }
    if (currentSong.title) {
      embed.addFields({ name: 'Titel', value: currentSong.title, inline: false });
    }
    embed.addFields({ name: 'Zuhörer', value: `${listeners}`, inline: false });
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

    log('success', 'Zufällige Station gestartet.', {
      server: { name: interaction.guild.name, id: interaction.guild.id },
      channel: { name: userChannel.name, id: userChannel.id },
      stream: { name: randomStation.station_name, id: randomStation.station_id }
    });
  } catch (error) {
    log('error', 'Fehler beim Starten der zufälligen Station.', { error: error.message });
    await interaction.editReply({ content: '❌ Fehler beim Abspielen der zufälligen Station. Bitte versuche es später erneut.', flags: 64 });
  }
}
