/**
 * `/dkp` command — displays a user's DKP (Dragon Kill Points) balance.
 *
 * Supports lookup by Discord `@user` mention, character name (autocomplete),
 * or defaults to the invoker. Shows current DKP (earned - spent) and
 * total earned in an embed.
 *
 * @module
 */
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from '../../platform/shim.js';
import { FindManyOptions, ILike } from 'typeorm';
import { AppDataSource } from '../../app_data.js';
import { ActiveToons } from '../../entities/ActiveToons.js';
import { Dkp } from '../../entities/Dkp.js';
import { returnAllActiveToonsByName } from '../../commands/census/census_functions.js';

export const data = new SlashCommandBuilder()
  .setName('dkp')
  .setDescription('Retrieve DKP for a user.')
  .addStringOption(option =>
    option.setName('user').setDescription('User to search for').setRequired(false),
  )
  .addStringOption(option =>
    option.setName('name').setDescription('Name of the toon').setAutocomplete(true),
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  try {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'name') {
      const options: FindManyOptions = {
        where: { Name: ILike(`%${focusedOption.value}%`) },
        take: 10,
      };

      const choices = await AppDataSource.manager.find(ActiveToons, options);
      await interaction.respond(choices.map(choice => ({ name: choice.Name, value: choice.Name })));
    }
  }
  catch (error) {
    if (error instanceof Error) {
      console.error('Error in autocomplete:', error);
    }
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const { options } = interaction;

    let DiscordId: string | null = null;
    let userDkp: Dkp | null = null;

    if (!options.get('user') && !options.get('name')) {
      DiscordId = interaction.user.id as string;

      if (!DiscordId) {
        throw new Error('No Discord ID found for this user.');
      }

      userDkp = await AppDataSource.manager.findOne(Dkp, { where: { DiscordId } });
    }
    else if (options.get('user')) {
      DiscordId = options.get('user')?.value as string;
      userDkp = await AppDataSource.manager.findOne(Dkp, { where: { DiscordId } });
    }
    else if (options.get('name')) {
      const toonsData = await returnAllActiveToonsByName(options.get('name')?.value as string);
      DiscordId = toonsData[0].DiscordId;
      if (!DiscordId) {
        throw new Error('No Discord ID found for this user.');
      }
      userDkp = await AppDataSource.manager.findOne(Dkp, { where: { DiscordId } });
    }
    if (!userDkp) {
      throw new Error(`No DKP found for this <@${DiscordId}>.`);
    }

    if (!DiscordId) {
      throw new Error('No Discord ID found for this user.');
    }

    const embed = new EmbedBuilder()
      .setTitle(':dragon: DKP Record')
      .setDescription(`<@${DiscordId}>\n<t:${Math.floor(Date.now() / 1000)}:R>`)
      .setColor('Green');

    // add a field for current DKP and a field for total earned
    const currentDkp = userDkp?.EarnedDkp - userDkp?.SpentDkp;
    const totalEarned = userDkp?.EarnedDkp;

    embed.addFields([
      {
        name: ':moneybag:️ Current DKP',
        value: currentDkp.toString(),
        inline: true,
      },
      {
        name: ':scroll: Total Earned',
        value: totalEarned.toString(),
        inline: true,
      },
    ]);

    await interaction.reply({ embeds: [embed] });
  }
  catch (error) {
    if (error instanceof Error) {
      console.error('Error in execute:', error);
      return interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
