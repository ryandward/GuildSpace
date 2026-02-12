/**
 * `/bot` command — registers or updates a character as Bot.
 *
 * @module
 */
import { ChatInputCommandInteraction, MessageFlags } from '../../platform/shim.js';
import _ from 'lodash';
import {
  declareOrUpdate,
  declareData,
  userMustExist,
} from '../../commands/census/census_functions.js';

export const data = await declareData('bot');

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const name = _.capitalize(options.get('name')?.value as string);
  const discordId = interaction.user.id;
  const characterClass = options.get('class')?.value as string;
  const level = options.get('level')?.value as number;

  try {
    await userMustExist(discordId);
    const result = await declareOrUpdate(discordId, 'Bot', name, level, characterClass);
    await interaction.reply(result.message);
    return interaction.followUp({
      content: ':warning: Disclaimer: Toons declared as bots can be claimed by other members.',
      flags: MessageFlags.Ephemeral,
    });
  }
  catch (error) {
    if (error instanceof Error) {
      return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
};
