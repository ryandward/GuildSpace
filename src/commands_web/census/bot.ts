/**
 * `/bot` command — registers a bot (shared/utility) character.
 *
 * Creates a `Census` record with status `"Bot"`. Bot characters can
 * be claimed by other members via the `/claim` command. A warning disclaimer
 * is shown to the declarer.
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

export const data = await declareData('bot');

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
    const newToonResult = await declare(discordId, 'Bot', name, level, characterClass);
    await interaction.reply(newToonResult);
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
