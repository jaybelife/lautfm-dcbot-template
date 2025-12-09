import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { log } from '../logger.js';
import dotenv from 'dotenv';

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName('hilfe')
  .setDescription('Zeigt eine Liste aller verfügbaren Befehle.');

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const commands = interaction.client.commands.map(cmd => ({
    name: `/${cmd.data.name}`,
    description: cmd.data.description
  }));

  const embed = new EmbedBuilder()
    .setTitle('Hilfe - Verfügbare Befehle')
    .setColor(process.env.EMBED_COLOR || '#FFFFFF') // Farbe aus der .env-Datei
    .setDescription('Hier ist eine Liste aller verfügbaren Befehle:')

  commands.forEach(cmd => {
    embed.addFields({ name: cmd.name, value: cmd.description, inline: false }); // Hier muss nichts angepasst werden, es fügt die Befehle dynamisch hinzu.
  });

  await interaction.editReply({ embeds: [embed], flags: 64 });

  // Loggt die Ausführung des Befehls
  log('info', 'Hilfe-Befehl ausgeführt.', {
    command: 'hilfe',
    server: { name: interaction.guild.name, id: interaction.guild.id },
    channel: { name: interaction.channel.name, id: interaction.channel.id }
  });
}
