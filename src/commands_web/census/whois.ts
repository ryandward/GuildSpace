/**
 * `/whois` command — looks up characters by user.
 *
 * CONVERTED: discord.js → platform shim
 * DIFF: 1 line changed (import)
 */
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from '../../platform/shim.js';
// WAS: } from '../../platform/shim.js';
import _ from 'lodash';
import { ActiveToons } from '../../entities/ActiveToons.js';
import { formatField, returnAllActiveToonsByDiscordId } from '../../commands/census/census_functions.js';

export const data = new SlashCommandBuilder()
  .setName('whois')
  .setDescription('Discovers toons related to a user.')
  .addStringOption(option =>
    option.setName('user').setDescription('User ID to search for').setRequired(false),
  );
  // WAS: .addUserOption — changed to string since we don't have Discord user resolution
  // The web UI will provide a user picker that submits the user ID as a string

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const { options } = interaction;

    let userId = interaction.user.id as string;

    if (options.get('user')) {
      userId = options.get('user')?.value as string;
    }

    const toonsData = await returnAllActiveToonsByDiscordId(userId);

    if (toonsData.length === 0) {
      throw new Error(':x: No toons found for this user.');
    }

    const statusOrder = ['Main', 'Alt', 'Bot', 'Dropped'];

    const embed = new EmbedBuilder()
      .setTitle(':busts_in_silhouette: Census Record')
      .setDescription(`User: ${userId}\n${new Date().toLocaleString()}`)
      // WAS: .setDescription(`<@${discordId}>\n<t:${Math.floor(Date.now() / 1000)}:R>`)
      // Stripped Discord-specific markdown
      .setColor('Green');

    const embedBuilder = statusOrder.reduce((currentEmbed, status) => {
      const toonsWithStatus = toonsData.filter((toon: ActiveToons) => toon.Status === status);
      if (toonsWithStatus.length === 0) return currentEmbed;

      const sortedToons = toonsWithStatus.sort((a: ActiveToons, b: ActiveToons) => b.Level - a.Level);
      const sortedToonNames = formatField(sortedToons.map((toon: ActiveToons) => _.capitalize(toon.Name)));
      const sortedToonClasses = formatField(sortedToons.map((toon: ActiveToons) => toon.CharacterClass));
      const sortedToonLevels = formatField(sortedToons.map((toon: ActiveToons) => toon.Level.toString()));

      return currentEmbed.addFields(
        {
          name: status,
          value: `${toonsWithStatus.length} character(s) declared as ${status.toLowerCase()}(s)`,
          inline: false,
        },
        { name: ':bust_in_silhouette: Name', value: sortedToonNames, inline: true },
        { name: ':crossed_swords: Class', value: sortedToonClasses, inline: true },
        { name: ':arrow_double_up: Level', value: sortedToonLevels, inline: true },
      );
    }, embed);

    await interaction.reply({ embeds: [embedBuilder], flags: MessageFlags.Ephemeral });
  }
  catch (error) {
    if (error instanceof Error) {
      return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
}
