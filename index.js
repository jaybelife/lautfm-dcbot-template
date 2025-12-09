import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

console.clear();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
client.commands = new Collection();
client.voiceConnection = null;
global.currentStationId = null;

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
