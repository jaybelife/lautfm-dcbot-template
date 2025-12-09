import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../logger.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stations = JSON.parse(fs.readFileSync(path.join(__dirname, '../stations.json'), 'utf-8'));

export const data = new SlashCommandBuilder()
  .setName('stationen')
  .setDescription('Zeigt eine Liste der verfügbaren Stationen in Seitenansicht.');

export async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  let currentPage = 0;
  const itemsPerPage = 4;
  const totalPages = Math.ceil(stations.length / itemsPerPage);

  const generateEmbed = async (page) => {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const stationsOnPage = stations.slice(start, end);

    const embed = new EmbedBuilder()
      .setTitle('Verfügbare Stationen')
      .setColor(process.env.EMBED_COLOR || '#FFFFFF'); // Farbe aus der .env-Datei

    for (const station of stationsOnPage) {
      const stationApiUrl = `https://api.laut.fm/station/${station.station_name}`;
      const stationData = await axios.get(stationApiUrl).then(res => res.data);

      embed.addFields({
        name: stationData.display_name,
        value: stationData.description,
        inline: false
      });
    }

    return embed;
  };

  const generateButtons = (page) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('page')
        .setLabel(`${page + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages - 1)
    );
  };

  const embed = await generateEmbed(currentPage);
  const buttons = generateButtons(currentPage);

  const message = await interaction.editReply({ embeds: [embed], components: [buttons], flags: 64 });

  log('info', 'Stationen-Befehl ausgeführt.', {
    command: 'stationen',
    server: { name: interaction.guild.name, id: interaction.guild.id },
    channel: { name: interaction.channel.name, id: interaction.channel.id }
  });

  const collector = message.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      await buttonInteraction.reply({ content: '❌ Du kannst diese Buttons nicht verwenden.', ephemeral: true });
      return;
    }

    if (buttonInteraction.customId === 'prev') {
      currentPage = Math.max(currentPage - 1, 0);
    } else if (buttonInteraction.customId === 'next') {
      currentPage = Math.min(currentPage + 1, totalPages - 1);
    }

    const updatedEmbed = await generateEmbed(currentPage);
    const updatedButtons = generateButtons(currentPage);

    await buttonInteraction.update({ embeds: [updatedEmbed], components: [updatedButtons] });

    log('info', 'Stationen-Seite geändert.', {
      user: interaction.user.username,
      server: interaction.guild.name,
      currentPage: currentPage + 1,
      totalPages
    });
  });

  collector.on('end', async () => {
    const disabledButtons = generateButtons(currentPage).components.map(button => button.setDisabled(true));
    await interaction.editReply({ components: [new ActionRowBuilder().addComponents(disabledButtons)] });
  });
}
