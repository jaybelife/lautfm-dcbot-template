import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import serverData from './serverData.js';
import { getOnAirConfig } from './dbManager.js';

dotenv.config();

console.clear();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
client.commands = new Collection();
client.voiceConnection = null;
global.currentStationId = null;

// Map um zu tracken welche Guilds gerade einen OnAir Stream starten (verhindert Duplicates)
const onAirStarting = new Set();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

client.once('clientReady', async () => {
  const reset = "\x1b[0m";
  const red = "\x1b[31m";
  const yellow = "\x1b[33m";
  const green = "\x1b[32m";
  const blue = "\x1b[34m";
  const magenta = "\x1b[35m";
  const bright = "\x1b[1m";

  // Funktion zum verzögerten anzeigen vom Logo in der Konsole
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const logDelayed = async (text) => { console.log(text); await sleep(100); }

  // Logs mit 0,1s Verzögerung
  await logDelayed("═══════════════════════════════════════════════════════════════════════════════════════════════════");
  await logDelayed(" ");
  await logDelayed(`${bright}${red}   ###                  #                     #                   ##        #       ####          `);
  await logDelayed(`${bright}${red}  #   #                                       #                    #               #              `);
  await logDelayed(`${bright}${yellow} #  #  #             ####    ######  #    #   ######    #####      #      ###     ####      ##### `);
  await logDelayed(`${bright}${yellow} # # # #                #   #     #  #    #   #     #  #     #     #        #      #       #     #`);
  await logDelayed(`${bright}${green} #  # #                 #   #     #  #    #   #     #  #######     #        #      #       #######`);
  await logDelayed(`${bright}${green}  #         ##          #   #    ##   #####   #     #  #           #        #      #       #      `);
  await logDelayed(`${bright}${blue}   ###      ##          #    #### #       #   ######    #####     ###     #####    #        ##### `);
  await logDelayed(`${bright}${blue}                    ####              ####                                                        `);
  await logDelayed(" ");
  await logDelayed(`${magenta}Bot-Status ${reset}`);
  await logDelayed("═══════════════════════════════════════════════════════════════════════════════════════════════════");
  await logDelayed(" ");
  await logDelayed(`Aktive Server: ${green}${bright}${client.guilds.cache.size}${reset}`);
  
  for (const guild of client.guilds.cache.values()) {
    await logDelayed(`${red}-${reset} ${guild.name}`);
  }

  await logDelayed(" ");
  await logDelayed("═══════════════════════════════════════════════════════════════════════════════════════════════════");
  await logDelayed(`${magenta}Copyyright © .jaybelife | www.jaybelife.de${reset}`);
  await logDelayed("═══════════════════════════════════════════════════════════════════════════════════════════════════");
  await logDelayed(" ");
  await logDelayed(`${green}${client.user.tag} meldet alle Systeme online!${reset}`);
  await logDelayed(" ");
  
  // Befehle synchronisieren
  const commands = client.commands.map(cmd => cmd.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

  try {
    console.log("Die Befehle werden synchronisiert...");

    console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════");

    const existing = await rest.get(Routes.applicationCommands(client.user.id));

    const existingMap = new Map(existing.map(cmd => [cmd.name, cmd]));

    const newMap = new Map(commands.map(cmd => [cmd.name, cmd]));

    for (const [name, oldCmd] of existingMap) {
      if (!newMap.has(name)) {
        // Gelöschter Befehl
        console.log(`❌ | /${name}`);
        await rest.delete(Routes.applicationCommand(client.user.id, oldCmd.id));
      }
    }

    for (const [name, newCmd] of newMap) {
      if (!existingMap.has(name)) {
        // Neuer Befehl
        console.log(`🆕 | /${name}`);
        await rest.post(Routes.applicationCommands(client.user.id), { body: newCmd });
        continue;
      }

      const oldCmd = existingMap.get(name);

      const oldStr = JSON.stringify(oldCmd.options ?? []);
      const newStr = JSON.stringify(newCmd.options ?? []);

      if (oldStr !== newStr || oldCmd.description !== newCmd.description) {
        // Geänderter Befehl
        console.log(`🔄 | /${name}`);
        await rest.patch(
          Routes.applicationCommand(client.user.id, oldCmd.id),
          { body: newCmd }
        );
      } else {
        // Unveränderter Befehl
        console.log(`✅ | /${name}`);
      }
    }
    
    console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════");

    console.log("Die Befehle wurden erfolgreich synchronisiert. Viel spaß mit dem Bot!\n");

  } catch (error) {
    // Fehler beim Synchronisieren der Befehle
    console.error(error);
  }

  // OnAir Channels rejoin nach Bot Neustart
  console.log("OnAir Channels werden wiederhergestellt...");
  try {
    const dbManager = await import('./dbManager.js');
    const allConfigs = dbManager.getAllOnAirConfigs();

    for (const [guildId, config] of Object.entries(allConfigs)) {
      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.voiceChannelId);
        if (!channel || !channel.isVoiceBased()) continue;

        const stations = JSON.parse(fs.readFileSync(path.join(__dirname, 'stations.json'), 'utf-8'));
        const station = stations.find(s => s.station_id === config.stationId);
        if (!station) continue;

        // Bot in Channel joinen
        const connection = joinVoiceChannel({
          channelId: config.voiceChannelId,
          guildId: guildId,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: false
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

        // Prüfe ob User im Channel sind
        const nonBotMembers = channel.members.filter(m => !m.user.bot).size;

        if (nonBotMembers > 0) {
          // Stream starten wenn User drin sind
          const player = createAudioPlayer();

          const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;
          const stationData = await axios.get(stationApiUrl).then(res => res.data);

          const streamUrl = `${stationData.stream_url}?ref=discord_bot&bot_id=${client.user.id}`;

          const resource = createAudioResource(streamUrl, { inlineVolume: true });
          resource.volume.setVolume(0.5);
          player.play(resource);
          connection.subscribe(player);

          serverData.set(guildId, { connection, station, player, isOnAir: true, guildId: guildId, lastStart: Date.now() });
          console.log(`[OnAir] ✅ Channel ${channel.name} auf ${guild.name} wiederhergestellt (Stream aktiv)`);
        } else {
          // Connection halten aber Stream inaktiv
          serverData.set(guildId, { connection, station: null, player: null, isOnAir: false, guildId: guildId });
          console.log(`[OnAir] ✅ Channel ${channel.name} auf ${guild.name} wiederhergestellt (wartet auf User)`);
        }
      } catch (err) {
        console.error(`[OnAir] Fehler beim Rejoin des Channels ${config.voiceChannelId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[OnAir] Fehler beim Laden der OnAir-Konfigurationen:', err.message);
  }
});

// Event-Listener für Interaktionen
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing this command.', flags: 64 });
  }
});

// OnAir VoiceStateUpdate Event
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild;
  const config = getOnAirConfig(guild.id);

  // Wenn kein OnAir aktiv ist, ignorieren
  if (!config || !config.voiceChannelId || !config.stationId) return;

  const voiceChannel = guild.channels.cache.get(config.voiceChannelId);
  if (!voiceChannel) return;

  const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot).size;
  const existingData = serverData.get(guild.id);

  // Wenn ein User in den OnAir Channel beitritt
  if (newState.channelId === config.voiceChannelId && nonBotMembers > 0) {
    // Wenn schon ein Stream läuft oder wir gerade dabei sind zu starten, ignorieren
    if ((existingData && existingData.isOnAir) || onAirStarting.has(guild.id)) {
      return;
    }

    // Flag setzen dass wir gerade starten
    onAirStarting.add(guild.id);

    // Stream starten
    try {
      const stations = JSON.parse(fs.readFileSync(path.join(__dirname, 'stations.json'), 'utf-8'));
      const station = stations.find(s => s.station_id === config.stationId);

      if (!station) {
        onAirStarting.delete(guild.id);
        return;
      }

      // Alte Connection zerstören wenn vorhanden
      if (existingData && existingData.connection && existingData.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        existingData.connection.destroy();
      }

      const connection = joinVoiceChannel({
        channelId: config.voiceChannelId,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      const player = createAudioPlayer();

      const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;
      const stationData = await axios.get(stationApiUrl).then(res => res.data);

      const streamUrl = `${stationData.stream_url}?ref=discord_bot&bot_id=${client.user.id}`;

      const resource = createAudioResource(streamUrl, { inlineVolume: true });
      resource.volume.setVolume(0.5);
      player.play(resource);
      connection.subscribe(player);

      serverData.set(guild.id, { connection, station, player, isOnAir: true, guildId: guild.id, lastStart: Date.now() });

      console.log(`[OnAir] Stream gestartet auf ${guild.name} - ${station.station_name}`);
    } catch (error) {
      console.error('OnAir Stream Start Fehler:', error);
    } finally {
      // Flag entfernen nachdem wir fertig sind
      onAirStarting.delete(guild.id);
    }
  }

  // Wenn der letzte User den OnAir Channel verlässt
  if (oldState.channelId === config.voiceChannelId && nonBotMembers === 0) {
    if (existingData && existingData.connection) {
      // Nur den Player stoppen, Connection bleibt aktiv (Bot bleibt im Channel!)
      if (existingData.player) {
        existingData.player.stop();
      }
      // Speichere dass Stream gestoppt ist, aber Connection noch aktiv
      serverData.set(guild.id, { ...existingData, isOnAir: false });
      console.log(`[OnAir] Stream gestoppt auf ${guild.name} - Kein User im Channel (Bot bleibt im Channel)`);
    }
  }
});

// Opus-Encoder laden
let Opus;
try {
  const opus = await import('@discordjs/opus');
  Opus = opus.default || opus;
} catch (e) {
  try {
    const nodeOpus = await import('node-opus');
    Opus = nodeOpus.default || nodeOpus;
  } catch (e) {
    const opusscript = await import('opusscript');
    Opus = opusscript.default || opusscript;
    console.warn('⚠️ Fallback auf opusscript. Dies kann die Leistung beeinträchtigen.');
  }
}

client.login(process.env.BOT_TOKEN);
