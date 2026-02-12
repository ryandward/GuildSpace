/**
 * `/main` command — registers a player's primary character.
 *
 * Creates a new `Census` record with status `"Main"`, inserts the user
 * into the `Dkp` table if they're new (via `insertUser`), and
 * assigns the "Probationary Member" role to first-time declarers.
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
  insertUser,
  levelMustBeValid,
  toonMustNotExist,
} from '../../commands/census/census_functions.js';

export const data = await declareData('main');

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const name = _.capitalize(options.get('name')?.value as string);
  const discordId = interaction.user.id;
  const characterClass = options.get('class')?.value as string;
  const level = options.get('level')?.value as number;

  try {
    let response: string;
    await toonMustNotExist(name);
    await levelMustBeValid(level);
    await classMustExist(characterClass);
    const newUserResult = await insertUser(discordId);
    const newToonResult = await declare(discordId, 'Main', name, level, characterClass);
    if (newUserResult) {
      response = newToonResult + '\n' + newUserResult;
    }
    else {
      response = newToonResult;
    }
    return interaction.reply(response);
  }
  catch (error) {
    if (error instanceof Error) {
      return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
};
