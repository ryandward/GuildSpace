/**
 * `/alt` command — registers an alternate character for an existing member.
 *
 * Validates the user already exists in `Dkp` (must have a main first),
 * then creates a new `Census` record with status `"Alt"`.
 *
 * Uses the shared `declareData` factory for its slash command definition.
 *
 * @module
 */
import { ChatInputCommandInteraction, MessageFlags } from '../../platform/shim.js';
import _ from 'lodash';
import {
  classMustExist,
  declare,
  declareData,
  levelMustBeValid,
  toonMustNotExist,
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
    await levelMustBeValid(level);
    await toonMustNotExist(name);
    await classMustExist(characterClass);
    const newToonResult = await declare(discordId, 'Alt', name, level, characterClass);
    return interaction.reply(newToonResult);
  }
  catch (error) {
    if (error instanceof Error) {
      return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
};
