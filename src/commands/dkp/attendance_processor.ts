/**
 * Processes a /who log into attendance records and DKP awards.
 *
 * Shared by the terminal `/attendance` command and the REST raid-call endpoint.
 * Cross-references parsed players against the census, creates attendance rows,
 * and increments DKP — identical to the original command logic.
 *
 * @module
 */

import { AppDataSource } from '../../app_data.js';
import { Attendance } from '../../entities/Attendance.js';
import { Census } from '../../entities/Census.js';
import { Dkp } from '../../entities/Dkp.js';
import { parseWhoLogs } from './who_parser.js';

export interface RecordedAttendee {
  discordId: string;
  characterName: string;
  attendanceId: string;
}

export interface RejectedPlayer {
  name: string;
  reason: string;
}

export interface AttendanceResult {
  recorded: RecordedAttendee[];
  rejected: RejectedPlayer[];
}

export async function processWhoLog(
  whoLog: string,
  raidName: string,
  modifier: number,
): Promise<AttendanceResult> {
  const players = parseWhoLogs(whoLog);

  const recorded: RecordedAttendee[] = [];
  const rejected: RejectedPlayer[] = [];

  if (players.length === 0) {
    return { recorded, rejected };
  }

  const census = await AppDataSource.manager.find(Census);
  const seenDiscordIds = new Set<string>();

  for (const player of players) {
    const censusEntry = census.find(c => c.Name === player.name);

    if (!censusEntry || !censusEntry.DiscordId) {
      rejected.push({ name: player.name, reason: 'Not registered' });
      continue;
    }

    const discordId = censusEntry.DiscordId;

    // Prevent double counting per discord account
    if (seenDiscordIds.has(discordId)) {
      continue;
    }
    seenDiscordIds.add(discordId);

    // Insert attendance record
    const attendance = new Attendance();
    attendance.Date = player.timestamp;
    attendance.Raid = raidName;
    attendance.Name = player.name;
    attendance.DiscordId = discordId;
    attendance.Modifier = modifier.toString();

    const saved = await AppDataSource.manager.save(attendance);

    // Update DKP
    await AppDataSource.manager
      .createQueryBuilder()
      .update(Dkp)
      .set({ EarnedDkp: () => `earned_dkp + ${modifier}` })
      .where('discord_id = :discordId', { discordId })
      .execute();

    recorded.push({
      discordId,
      characterName: player.name,
      attendanceId: saved.Id,
    });
  }

  return { recorded, rejected };
}
