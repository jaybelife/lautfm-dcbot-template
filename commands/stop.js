import { SlashCommandBuilder } from 'discord.js';
import serverData from '../serverData.js';
import { deleteOnAirConfig } from '../dbManager.js';
import { log } from '../logger.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stoppt die Wiedergabe und verlässt den Sprachkanal.');

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const serverInfo = serverData.get(interaction.guild.id);
  if (!serverInfo) {
    await interaction.editReply({ content: '❌ Der Bot ist aktuell nicht mit einem Sprachkanal verbunden.', flags: 64 });
    log('warn', 'Stop-Befehl ausgeführt, aber keine Verbindung gefunden.', { server: interaction.guild.name });
    return;
  }

  const { connection } = serverInfo;
  const botChannel = connection.joinConfig.channelId;
  const userChannel = interaction.member.voice.channelId;

  if (!userChannel || userChannel !== botChannel) {
    await interaction.editReply({ content: '❌ Du musst dich im gleichen Sprachkanal wie der Bot befinden, um diesen Befehl zu verwenden.', flags: 64 });
    log('warn', 'Benutzer ist nicht im gleichen Sprachkanal wie der Bot.', {
      server: interaction.guild.name,
      user: interaction.user.username,
      botChannel,
      userChannel
    });
    return;
  }

  try {
    connection.destroy();
    serverData.delete(interaction.guild.id);

    // Auch OnAir Konfiguration löschen wenn aktiv
    if (serverInfo.isOnAir) {
      deleteOnAirConfig(interaction.guild.id);
    }

    log('success', 'Wiedergabe gestoppt und Sprachkanal verlassen.', {
      server: { name: interaction.guild.name, id: interaction.guild.id },
      channel: { name: interaction.channel.name, id: interaction.channel.id }
    });

    await interaction.editReply({ content: '⏹️ Wiedergabe gestoppt und Sprachkanal verlassen.', flags: 64 });
  } catch (error) {
    log('error', 'Fehler beim Trennen der Verbindung.', { error: error.message });
    await interaction.editReply({ content: '❌ Fehler beim Trennen der Verbindung. Bitte versuche es später erneut.', flags: 64 });
  }
}
