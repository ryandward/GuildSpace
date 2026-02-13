/**
 * `/attendance` command — records raid attendance from pasted `/who` logs.
 *
 * Flow: officer selects a raid (autocomplete from `Raids` table) ->
 * modal opens for pasting `/who` output -> `parseWhoLogs` extracts
 * player names -> cross-references with `Census` -> creates
 * `Attendance` records and awards DKP.
 *
 * This is the most complex command, using a modal submission flow via
 * `handleModal` and an in-memory `pendingRaids` map to bridge
 * the command and modal interactions.
 *
 * Requires `ManageRoles` permission.
 *
 * @module
 */
import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from '../../platform/shim.js';
import { ILike } from 'typeorm';
import { AppDataSource } from '../../app_data.js';
import { Raids } from '../../entities/Raids.js';
import { processWhoLog } from '../../commands/dkp/attendance_processor.js';

export const data = new SlashCommandBuilder()
  .setName('attendance')
  .setDescription('Record attendance from /who logs')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption(option =>
    option
      .setName('raid')
      .setDescription('Raid name or DKP modifier value')
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  try {
    const focusedOption = interaction.options.getFocused(true);
    if (!focusedOption) return;

    if (focusedOption.name === 'raid') {
      const raids = await AppDataSource.manager.find(Raids, {
        where: { Raid: ILike(`%${focusedOption.value}%`) },
        take: 25,
      });

      return await interaction.respond(
        raids.map(raid => ({
          name: `${raid.Raid} (${raid.Modifier} DKP)`,
          value: String(raid.Raid),
        })),
      );
    }
  }
  catch (error) {
    console.error('Error in attendance autocomplete:', error);
  }
}

// Store selected raid temporarily for modal submission
const pendingRaids = new Map<string, string>();

export async function execute(interaction: ChatInputCommandInteraction) {
  const raidName = interaction.options.getString('raid', true);

  // Store the raid selection for when modal is submitted
  pendingRaids.set(interaction.user.id, raidName);

  // Create modal for pasting logs
  const modal = new ModalBuilder().setCustomId('attendance_modal').setTitle('Paste /who Logs');

  const logsInput = new TextInputBuilder()
    .setCustomId('logs_input')
    .setLabel('Paste your /who output here')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('[Wed Jul 03 20:16:36 2024] [60 Warlock] Azrosaurus (Iksar) <Ex Astra>')
    .setRequired(true);

  const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(logsInput);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

export async function handleModal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply();

  try {
    const logs = interaction.fields.getTextInputValue('logs_input');
    const raidName = pendingRaids.get(interaction.user.id);

    // Clean up
    pendingRaids.delete(interaction.user.id);

    if (!raidName) {
      await interaction.editReply('Error: No raid selected. Please run /attendance again.');
      return;
    }

    // Get raid modifier
    let modifier: number;
    const parsedModifier = parseInt(raidName, 10);

    if (!isNaN(parsedModifier)) {
      // Direct DKP value provided
      modifier = parsedModifier;
    }
    else {
      // Look up raid in database
      const raid = await AppDataSource.manager.findOne(Raids, {
        where: { Raid: raidName },
      });

      if (!raid || raid.Modifier === null) {
        await interaction.editReply(`\`${raidName}\` not found in raids table. Ask Rahmani.`);
        return;
      }

      modifier = raid.Modifier;
    }

    // Process the /who logs using shared logic
    const result = await processWhoLog(logs, raidName, modifier);

    if (result.recorded.length === 0 && result.rejected.length === 0) {
      await interaction.editReply('No valid player entries found in the logs.');
      return;
    }

    // Build response
    const embed = new EmbedBuilder()
      .setTitle(':dragon: Attendance Recorded')
      .setColor('Green')
      .setTimestamp();

    if (result.recorded.length > 0) {
      const mentions = result.recorded.map(r => `<@${r.discordId}>`);
      embed.setDescription(
        `${mentions.join(', ')} earned \`${modifier}\` DKP for \`${raidName}\``,
      );
    }

    if (result.rejected.length > 0) {
      const rejectedText = result.rejected.slice(0, 20).map(r => `${r.name} - ${r.reason}`).join('\n');
      embed.addFields({
        name: ':question: Unregistered Players',
        value: `\`\`\`\n${rejectedText}\n\`\`\``,
      });
    }

    embed.addFields(
      { name: 'Recorded', value: result.recorded.length.toString(), inline: true },
      { name: 'Rejected', value: result.rejected.length.toString(), inline: true },
    );

    await interaction.editReply({ embeds: [embed] });
  }
  catch (error) {
    console.error('Error in attendance execute:', error);
    if (error instanceof Error) {
      await interaction.editReply({ content: `:x: Error: ${error.message}` });
    }
  }
}
