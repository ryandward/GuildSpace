/**
 * `/drop` command — soft-deletes a character by setting its status to `"Dropped"`.
 *
 * The record remains in the `Census` table but is excluded from the
 * `ActiveToons` view. Autocomplete only shows the invoker's own characters.
 *
 * @module
 */
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from '../../platform/shim.js';
import _ from 'lodash';
import { FindManyOptions, ILike } from 'typeorm';
import { AppDataSource } from '../../app_data.js';
import { ActiveToons } from '../../entities/ActiveToons.js';

export const data = new SlashCommandBuilder()
  .setName('drop')
  .setDescription('Drop a character from the census')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('The name of the character')
      .setRequired(true)
      .setAutocomplete(true)
      .setMaxLength(24),
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  try {
    const focusedOption = interaction.options.getFocused(true);
    if (!focusedOption) return;
    const discordId = interaction.user.id;

    if (focusedOption.name === 'name') {
      const choices: FindManyOptions = {
        where: {
          Name: ILike(`%${focusedOption.value}%`),
          DiscordId: discordId,
        },
        take: 10,
      };
      const toons = await AppDataSource.manager.find(ActiveToons, choices);
      await interaction.respond(toons.map(toon => ({
        name: toon.Name,
        value: toon.Name,
      })));
    }
  }
  catch (error) {
    console.error('Error in autocomplete:', error);
  }
}

export const execute = async (interaction: ChatInputCommandInteraction) => {
  try {
    const { options } = interaction;
    const name = _.capitalize(options.get('name')?.value as string);
    const discordId = interaction.user.id;

    const toon = AppDataSource.manager.findOne(ActiveToons, {
      where: { DiscordId: discordId, Name: name },
    });

    if (!toon) {
      throw new Error(`:x: ${name} doesn't exist. Use /toons to see your characters.`);
    }
    else {
      await AppDataSource.manager.update(
        ActiveToons,
        { DiscordId: discordId, Name: name },
        { Status: 'Dropped' },
      );
      return interaction.reply(`:white_check_mark: ${name} has been dropped.`);
    }
  }
  catch (error) {
    if (error instanceof Error) {
      return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
};
