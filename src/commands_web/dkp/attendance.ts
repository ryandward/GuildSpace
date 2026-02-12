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
import { Attendance } from '../../entities/Attendance.js';
import { Census } from '../../entities/Census.js';
import { ClassDefinitions } from '../../entities/ClassDefinitions.js';
import { Dkp } from '../../entities/Dkp.js';
import { Raids } from '../../entities/Raids.js';

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

interface ParsedPlayer {
  timestamp: Date;
  level: number | null;
  className: string | null;
  name: string;
  guild: string | null;
}

function parseWhoLogs(logs: string): ParsedPlayer[] {
  const players: ParsedPlayer[] = [];
  const lines = logs.split('\n');

  // Regex patterns from Python code
  const timestampRe = /^\[([^\]]+)\]/;
  const levelClassRe = /(?<=(?<!^)\[)[^\]]*(?=\])/;
  const nameRe = /(?<=\] )[^[]+?(?=[ <(])/;
  const guildRe = /(?<=<)[^>]*(?=>)/;

  for (const rawLine of lines) {
    let line = rawLine.trim();

    if (line.length === 0) continue;

    // Skip lines without guild tags (unless ANONYMOUS)
    if ((!line.includes('<') || !line.includes('>')) && !line.includes('ANONYMOUS')) {
      continue;
    }

    // Clean up the line
    line = line.replace(/ AFK /g, '');
    line = line.replace(/ LFG/g, '');
    line = line.replace(/ <LINKDEAD>/g, '');

    // Parse timestamp
    const timestampMatch = line.match(timestampRe);
    if (!timestampMatch) continue;

    let timestamp: Date;
    try {
      // EQ format: "Thu May 25 22:10:50 2023"
      timestamp = new Date(timestampMatch[1]);
      if (isNaN(timestamp.getTime())) {
        timestamp = new Date();
      }
    }
    catch {
      timestamp = new Date();
    }

    // Parse level/class - looking for [60 High Priest] or [ANONYMOUS]
    const levelClassMatch = line.match(levelClassRe);
    let level: number | null = null;
    let className: string | null = null;

    if (levelClassMatch) {
      const parts = levelClassMatch[0].trim().split(' ');
      if (parts[0] === 'ANONYMOUS') {
        level = null;
        className = null;
      }
      else if (parts.length >= 2) {
        level = parseInt(parts[0], 10) || null;
        className = parts.slice(1).join(' ');
      }
    }

    // Parse name
    const nameMatch = line.match(nameRe);
    if (!nameMatch) continue;
    const name = nameMatch[0].trim();

    // Parse guild
    const guildMatch = line.match(guildRe);
    const guild = guildMatch ? guildMatch[0] : null;

    players.push({
      timestamp,
      level,
      className,
      name,
      guild,
    });
  }

  return players;
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

    // Parse the /who logs
    const players = parseWhoLogs(logs);

    if (players.length === 0) {
      await interaction.editReply('No valid player entries found in the logs.');
      return;
    }

    // Get census data for matching
    const census = await AppDataSource.manager.find(Census);
    const classDefinitions = await AppDataSource.manager.find(ClassDefinitions);

    const seenDiscordIds: Set<string> = new Set();
    const successfulPlayers: string[] = [];
    const rejectedLines: string[] = [];

    for (const player of players) {
      // Find player in census
      const censusEntry = census.find(c => c.Name === player.name);

      if (!censusEntry || !censusEntry.DiscordId) {
        rejectedLines.push(`${player.name} - Not registered`);
        continue;
      }

      const discordId = censusEntry.DiscordId;

      // Prevent double counting
      if (seenDiscordIds.has(discordId)) {
        continue;
      }
      seenDiscordIds.add(discordId);

      // Get character class from class_definitions if we have level/class info
      // (kept for potential future use - updating census level/class)
      if (player.className) {
        const classDef = classDefinitions.find(cd => cd.ClassName === player.className);
        if (classDef) {
          // Could update census level/class here if needed
          void classDef;
        }
      }

      // Insert attendance record
      const attendance = new Attendance();
      attendance.Date = player.timestamp;
      attendance.Raid = raidName;
      attendance.Name = player.name;
      attendance.DiscordId = discordId;
      attendance.Modifier = modifier.toString();

      await AppDataSource.manager.save(attendance);

      // Update DKP
      await AppDataSource.manager
        .createQueryBuilder()
        .update(Dkp)
        .set({ EarnedDkp: () => `earned_dkp + ${modifier}` })
        .where('discord_id = :discordId', { discordId })
        .execute();

      successfulPlayers.push(`<@${discordId}>`);
    }

    // Build response
    const embed = new EmbedBuilder()
      .setTitle(':dragon: Attendance Recorded')
      .setColor('Green')
      .setTimestamp();

    if (successfulPlayers.length > 0) {
      embed.setDescription(
        `${successfulPlayers.join(', ')} earned \`${modifier}\` DKP for \`${raidName}\``,
      );
    }

    if (rejectedLines.length > 0) {
      const rejectedText = rejectedLines.slice(0, 20).join('\n');
      embed.addFields({
        name: ':question: Unregistered Players',
        value: `\`\`\`\n${rejectedText}\n\`\`\``,
      });
    }

    embed.addFields(
      { name: 'Recorded', value: successfulPlayers.length.toString(), inline: true },
      { name: 'Rejected', value: rejectedLines.length.toString(), inline: true },
    );

    await interaction.editReply({ embeds: [embed] });

    // Add reaction equivalent - we can't add reactions to slash command replies easily
    // but the embed serves as confirmation
  }
  catch (error) {
    console.error('Error in attendance execute:', error);
    if (error instanceof Error) {
      await interaction.editReply({ content: `:x: Error: ${error.message}` });
    }
  }
}
