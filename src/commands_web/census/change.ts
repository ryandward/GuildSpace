/**
 * `/change` command — changes a character's status (Main, Alt, Bot).
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
import { ILike } from 'typeorm';
import { AppDataSource } from '../../app_data.js';
import { ActiveToons } from '../../entities/ActiveToons.js';
import { Status } from '../../entities/Status.js';

const activeStatuses = (await AppDataSource.manager.find(Status)).filter(
  status => status.Status !== 'Dropped',
);

export const data = new SlashCommandBuilder()
  .setName('change')
  .setDescription('Change the status of a character')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('The name of the character')
      .setRequired(true)
      .setAutocomplete(true)
      .setMaxLength(24),
  )
  .addStringOption(option =>
    option
      .setName('status')
      .setDescription('The new status of the character')
      .setRequired(true)
      .addChoices(...activeStatuses.map(status => ({ name: status.Status, value: status.Status }))),
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  try {
    const focusedOption = interaction.options.getFocused(true);
    if (!focusedOption) return;
    const discordId = interaction.user.id;

    if (focusedOption.name === 'name') {
      const choices = {
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
        metadata: { level: Number(toon.Level), class: toon.CharacterClass, status: toon.Status },
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
    const status = options.get('status')?.value as string;
    const discordId = interaction.user.id;

    const toon = await AppDataSource.manager.findOne(ActiveToons, {
      where: { DiscordId: discordId, Name: name },
    });

    if (!toon) {
      throw new Error(`:x: ${name} doesn't exist. Use /toons to see your characters.`);
    }

    // Can't demote the user's last Main
    if (toon.Status === 'Main' && status !== 'Main') {
      const mainCount = await AppDataSource.manager.count(ActiveToons, {
        where: { DiscordId: discordId, Status: 'Main' },
      });
      if (mainCount <= 1) {
        throw new Error(`:x: Cannot change \`${name}\` to ${status} — it's your only Main.`);
      }
    }

    await AppDataSource.manager.update(
      ActiveToons,
      { DiscordId: discordId, Name: name },
      { Status: status },
    );
    await interaction.reply(
      `:white_check_mark: \`${name}\`'s status has been changed to \`${status}\`.`,
    );
  }
  catch (error) {
    if (error instanceof Error) {
      return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
};
