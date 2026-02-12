/**
 * `/main` command — registers or updates a character as Main.
 *
 * @module
 */
import { ChatInputCommandInteraction, MessageFlags } from '../../platform/shim.js';
import _ from 'lodash';
import {
  declareOrUpdate,
  declareData,
  insertUser,
} from '../../commands/census/census_functions.js';

export const data = await declareData('main');

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const name = _.capitalize(options.get('name')?.value as string);
  const discordId = interaction.user.id;
  const characterClass = options.get('class')?.value as string;
  const level = options.get('level')?.value as number;

  try {
    const newUserResult = await insertUser(discordId);
    const result = await declareOrUpdate(discordId, 'Main', name, level, characterClass);

    let response = result.message;
    if (newUserResult) {
      response += '\n' + newUserResult;
    }
    return interaction.reply(response);
  }
  catch (error) {
    if (error instanceof Error) {
      return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
};
