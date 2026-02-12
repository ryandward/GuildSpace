/**
 * `/alt` command — registers or updates a character as Alt.
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

export const data = await declareData('alt');

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const name = _.capitalize(options.get('name')?.value as string);
  const discordId = interaction.user.id;
  const characterClass = options.get('class')?.value as string;
  const level = options.get('level')?.value as number;

  try {
    await userMustExist(discordId);
    const result = await declareOrUpdate(discordId, 'Alt', name, level, characterClass);
    return interaction.reply(result.message);
  }
  catch (error) {
    if (error instanceof Error) {
      return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
};
