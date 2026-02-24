import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import serverData from '../serverData.js';
import { setOnAirVoiceChannel, setOnAirStation, deleteOnAirConfig, getOnAirConfig } from '../dbManager.js';
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
  )
  .addStringOption(option =>
    option
      .setName('onair')
      .setDescription('24/7 OnAir Mode')
      .setRequired(false)
      .addChoices(
        { name: 'set', value: 'set' },
        { name: 'remove', value: 'remove' }
      )
  )
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Voice Channel für 24/7 OnAir (wird beim onair:set benötigt)')
      .setRequired(false)
  );

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

  const stationId = parseInt(interaction.options.getString('station'));
  const onairAction = interaction.options.getString('onair');
  const onairChannel = interaction.options.getChannel('channel');

  const station = stations.find(s => s.station_id === stationId);

  if (!station) {
    await interaction.editReply({ content: '❌ Station nicht gefunden.', flags: 64 });
    log('warn', 'Station nicht gefunden.', { stationId });
    return;
  }

  let channel = interaction.member.voice.channel;

  // OnAir Mode Handle - SET
  if (onairAction === 'set') {
    if (!onairChannel) {
      await interaction.editReply({
        content: '❌ Du musst einen Channel für OnAir Mode angeben (onair:set channel:<channel>).',
        flags: 64
      });
      return;
    }

    if (!onairChannel.isVoiceBased()) {
      await interaction.editReply({
        content: '❌ Der gewählte Channel ist kein Voice Channel.',
        flags: 64
      });
      return;
    }

    // OnAir Konfiguration speichern
    setOnAirVoiceChannel(interaction.guild.id, onairChannel.id);
    setOnAirStation(interaction.guild.id, stationId);

    // Stream starten wenn User im Channel sind
    const nonBotMembers = onairChannel.members.filter(m => !m.user.bot).size;
    if (nonBotMembers > 0) {
      // Alte Connection zerstören falls vorhanden
      if (serverData.has(interaction.guild.id)) {
        const existingData = serverData.get(interaction.guild.id);
        if (existingData.connection && existingData.connection.state.status !== VoiceConnectionStatus.Destroyed) {
          existingData.connection.destroy();
        }
      }

      try {
        const connection = joinVoiceChannel({
          channelId: onairChannel.id,
          guildId: onairChannel.guild.id,
          adapterCreator: onairChannel.guild.voiceAdapterCreator,
          selfDeaf: false
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

        const player = createAudioPlayer();

        const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;
        const stationData = await axios.get(stationApiUrl).then(res => res.data);

        const streamUrl = `${stationData.stream_url}?ref=discord_bot&bot_id=${interaction.client.user.id}`;
        const resource = createAudioResource(streamUrl, { inlineVolume: true });
        resource.volume.setVolume(0.5);
        player.play(resource);
        connection.subscribe(player);

        serverData.set(interaction.guild.id, { connection, station, player, isOnAir: true, guildId: interaction.guild.id, lastStart: Date.now() });

        log('success', 'OnAir Mode gestartet.', {
          server: { name: interaction.guild.name, id: interaction.guild.id },
          channel: { name: onairChannel.name, id: onairChannel.id },
          stream: { name: station.station_name, id: station.station_id }
        });

        // Hole Song und Listener Info für Embed
        const songApiUrl = `https://api.laut.fm/station/${station.station_name}/current_song`;
        const listenersApiUrl = `https://api.laut.fm/station/${station.station_name}/listeners`;

        const [songResponse, listenersResponse] = await Promise.all([
          axios.get(songApiUrl),
          axios.get(listenersApiUrl)
        ]);

        const currentSong = songResponse.data || { title: 'Unbekannt', artist: { name: 'Unbekannt' } };
        const listeners = listenersResponse.data || 0;
        const stationLogo = stationData.images?.station || null;
        const stationDescription = stationData.description || null;

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
        embed.addFields({ name: 'Zuhörer', value: `${listeners}`, inline: false });
        if (stationLogo) {
          embed.setImage(stationLogo);
        }

        await interaction.editReply({ embeds: [embed], flags: 64 });
      } catch (error) {
        log('error', 'Fehler beim Starten des OnAir Streams.', { error: error.message });
        await interaction.editReply({ content: '❌ Fehler beim Starten des OnAir Streams.', flags: 64 });
        return;
      }
    } else {
      // Wenn niemand im Channel ist, nur Konfiguration anzeigen
      const embed = new EmbedBuilder()
        .setTitle(`✅ OnAir Mode aktiviert`)
        .setDescription(`**Channel:** ${onairChannel.name}\n**Station:** ${station.station_name}`)
        .setColor(station.station_color)
        .setFooter({ text: '⏳ Wartet auf User...' });

      await interaction.editReply({ embeds: [embed], flags: 64 });
    }
    return;
  }

  // OnAir Mode Handle - REMOVE
  if (onairAction === 'remove') {
    const config = getOnAirConfig(interaction.guild.id);

    if (!config) {
      await interaction.editReply({
        content: '❌ Kein OnAir Modus aktiv.',
        flags: 64
      });
      return;
    }

    deleteOnAirConfig(interaction.guild.id);

    if (serverData.has(interaction.guild.id)) {
      const data = serverData.get(interaction.guild.id);
      if (data.connection && data.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        data.connection.destroy();
      }
      serverData.delete(interaction.guild.id);
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ OnAir Modus beendet')
      .setDescription('Der 24/7 Modus wurde deaktiviert und der Bot hat den Channel verlassen.')
      .setColor('#FF0000');

    await interaction.editReply({ embeds: [embed], flags: 64 });

    log('info', 'OnAir Modus beendet', { guild: interaction.guild.name });
    return;
  }

  // Normaler Radio Mode (ohne OnAir)
  if (!channel) {
    await interaction.editReply({ content: '❌ Du musst dich in einem Sprachkanal befinden, um eine Radiostation abspielen zu können.', flags: 64 });
    log('warn', 'Benutzer ist nicht in einem Sprachkanal.', { user: interaction.user.username });
    return;
  }

  try {
    if (serverData.has(interaction.guild.id)) {
      const existingData = serverData.get(interaction.guild.id);
      if (existingData.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        existingData.connection.destroy();
      }
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

    const songApiUrl = `https://api.laut.fm/station/${station.station_name}/current_song`;
    const listenersApiUrl = `https://api.laut.fm/station/${station.station_name}/listeners`;

    const [songResponse, listenersResponse] = await Promise.all([
      axios.get(songApiUrl),
      axios.get(listenersApiUrl)
    ]);

    const currentSong = songResponse.data || { title: 'Unbekannt', artist: { name: 'Unbekannt' } };
    const listeners = listenersResponse.data || 0;

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
