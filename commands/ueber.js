import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import serverData from '../serverData.js';
import { log } from '../logger.js';
import dotenv from 'dotenv';

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName('über')
  .setDescription('Zeigt Informationen über den Bot an.');

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  // Berechnet die Anzahl der Server, auf denen der Bot aktiv ist
  const totalServers = interaction.client.guilds.cache.size;
  let activeListeners = 0;

  // Berechnet die aktiven Zuhörer in allen Voice-Kanälen
  for (const [guildId, data] of serverData.entries()) {
    const channel = interaction.client.channels.cache.get(data.connection.joinConfig.channelId);
    if (channel && channel.isVoiceBased()) {
      activeListeners += channel.members.filter(member => !member.user.bot).size;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`Über den Bot`)
    .setDescription(
      `Ich bin **<@${interaction.client.user.id}>**, ein Radio-Bot, der dir die besten Sender direkt in deinen Discord-Server bringt! 🎶\n\n` +
      `Mit einer Vielzahl von Funktionen wie **Senderauswahl**, **Statistiken** und **aktuellen Songs** bin ich dein perfekter Begleiter für musikalische Unterhaltung.\n\n` +
      `Vielen Dank, dass du mich benutzt! ❤️`
    )
    .setColor(process.env.EMBED_COLOR || '#FFFFFF') // Farbe aus der .env-Datei
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .addFields(
      { name: '🌐 Server', value: `${totalServers}`, inline: true },
      { name: '🎧 Aktive Zuhörer', value: `${activeListeners}`, inline: true }
    )
    .setFooter({ text: '»  made by jay with heart' }); // Dieser Inhalt darf nicht entfernt oder verändert werden. Danke fürs Verständnis! :)

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('🌐 Website')
      .setStyle(ButtonStyle.Link)
      .setURL(process.env.WEBSITE_URL || 'https://laut.fm/') // Link zur Website aus der .env-Datei
  );

  await interaction.editReply({ embeds: [embed], components: [buttons], flags: 64 });

  log('info', 'Über-Befehl ausgeführt.', {
    command: 'über',
    server: { name: interaction.guild.name, id: interaction.guild.id },
    channel: { name: interaction.channel.name, id: interaction.channel.id }
  });
}
