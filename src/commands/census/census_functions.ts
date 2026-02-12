/**
 * Shared census helpers — standalone, no Discord dependency.
 */
import 'dotenv/config';
import { FindManyOptions, FindOneOptions, ILike, LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../../app_data.js';
import { ActiveToons } from '../../entities/ActiveToons.js';
import { Census } from '../../entities/Census.js';
import { ClassDefinitions } from '../../entities/ClassDefinitions.js';
import { Dkp } from '../../entities/Dkp.js';
import { SlashCommandBuilder } from '../../platform/shim.js';

export async function levelMustBeValid(Level: number) {
  if (Level < 1 || Level > 60) throw new Error(':x: Level must be between 1 and 60.');
  return Level;
}

export async function toonMustExist(Name: string) {
  const toon = await AppDataSource.manager.findOne(Census, { where: { Name } });
  if (!toon) throw new Error(`:x: ${Name} doesn't exist. Use /main, /alt, or /bot to declare them.`);
  return toon;
}

export async function toonMustNotExist(Name: string) {
  const toon = await AppDataSource.manager.findOne(Census, { where: { Name } });
  if (toon) throw new Error(`:x: ${Name} already exists. Use /change to update them.`);
  return toon;
}

export async function classMustExist(CharacterClass: string) {
  const classEntered = await AppDataSource.manager.findOne(ClassDefinitions, {
    where: { CharacterClass },
  });
  if (!classEntered) throw new Error(`:x: "${CharacterClass}" isn't a valid class. Use autocomplete to pick one.`);
  return classEntered;
}

export async function userMustExist(UserId: string) {
  const user = await AppDataSource.manager.findOne(Dkp, { where: { DiscordId: UserId } });
  if (!user) throw new Error(`:x: You're not registered yet. Use /main to declare your first character.`);
  return user;
}

export async function suggestActiveToons(partialName: string) {
  const options: FindManyOptions = {
    where: { Name: ILike(`%${partialName}%`) },
    take: 20,
  };
  return await AppDataSource.manager.find(ActiveToons, options);
}

export async function suggestCharacterClasses(partialName: string, level?: number) {
  const options: FindManyOptions = {
    where: {
      ClassName: ILike(`%${partialName}%`),
      LevelAttained: LessThanOrEqual(level ? level : 1),
    },
    order: { LevelAttained: 'DESC' },
    take: 20,
  };
  return await AppDataSource.manager.find(ClassDefinitions, options);
}

export async function returnAllActiveToonsByDiscordId(userId: string) {
  const otherToons: FindManyOptions = {
    where: { DiscordId: userId },
  };
  return await AppDataSource.manager.find(ActiveToons, otherToons);
}

export async function returnAllActiveToonsByName(partialName: string) {
  const targetToon: FindOneOptions = {
    where: { Name: ILike(`%${partialName}%`) },
  };
  const toon = await AppDataSource.manager.findOne(ActiveToons, targetToon);
  if (!toon) return [];
  return await returnAllActiveToonsByDiscordId(toon.DiscordId);
}

export async function validCharacterClasses() {
  const records = await AppDataSource.manager
    .createQueryBuilder(ClassDefinitions, 'c')
    .select('c.CharacterClass')
    .where('c.CharacterClass = c.ClassName')
    .orderBy('c.CharacterClass')
    .getMany();

  return records.map(record => ({
    name: record.CharacterClass,
    value: record.CharacterClass,
  }));
}

export async function declareData(status: string) {
  const classNames = await validCharacterClasses();

  return new SlashCommandBuilder()
    .setName(status)
    .setDescription(`Declare character as "${status}"`)
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('The name of the character')
        .setRequired(true)
        .setMaxLength(24),
    )
    .addNumberOption(option =>
      option
        .setName('level')
        .setDescription('The level of the character')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(60),
    )
    .addStringOption(option =>
      option
        .setName('class')
        .setDescription('The class of the character')
        .setRequired(true)
        .addChoices(...classNames),
    );
}

export async function declare(
  UserId: string,
  Status: string,
  Name: string,
  Level: number,
  CharacterClass: string,
): Promise<string> {
  const newToon = new Census();
  newToon.DiscordId = UserId;
  newToon.Status = Status;
  newToon.Name = Name;
  newToon.Level = Level;
  newToon.CharacterClass = CharacterClass;
  newToon.Time = new Date();

  return AppDataSource.manager
    .save(newToon)
    .then(() => {
      return `✅ ${Name} is now a level ${Level} ${Status} ${CharacterClass}!`;
    })
    .catch(error => {
      return `Error declaring ${Name}: ${error}`;
    });
}

/**
 * Create a toon if new, or update it if the user already owns it.
 * Throws if the toon belongs to someone else.
 * Validates level and class.
 * Prevents demoting the user's last Main.
 */
export async function declareOrUpdate(
  UserId: string,
  Status: string,
  Name: string,
  Level: number,
  CharacterClass: string,
): Promise<{ message: string; isUpdate: boolean; previousStatus?: string }> {
  await levelMustBeValid(Level);
  await classMustExist(CharacterClass);

  const existing = await AppDataSource.manager.findOne(Census, { where: { Name } });

  if (existing) {
    if (existing.DiscordId !== UserId) {
      throw new Error(`:x: ${Name} belongs to another player.`);
    }

    const previousStatus = existing.Status;

    // Can't demote the user's last Main
    if (previousStatus === 'Main' && Status !== 'Main') {
      const mainCount = await AppDataSource.manager.count(ActiveToons, {
        where: { DiscordId: UserId, Status: 'Main' },
      });
      if (mainCount <= 1) {
        throw new Error(`:x: Cannot change \`${Name}\` to ${Status} — it's your only Main.`);
      }
    }

    await AppDataSource.manager.update(
      Census,
      { Name, DiscordId: UserId },
      { Status, Level, CharacterClass, Time: new Date() },
    );

    return {
      message: `✅ ${Name} updated to level ${Level} ${Status} ${CharacterClass}!`,
      isUpdate: true,
      previousStatus,
    };
  }

  const newToon = new Census();
  newToon.DiscordId = UserId;
  newToon.Status = Status;
  newToon.Name = Name;
  newToon.Level = Level;
  newToon.CharacterClass = CharacterClass;
  newToon.Time = new Date();
  await AppDataSource.manager.save(newToon);

  return {
    message: `✅ ${Name} is now a level ${Level} ${Status} ${CharacterClass}!`,
    isUpdate: false,
  };
}

export async function insertUser(DiscordId: string): Promise<string | null> {
  const user = await AppDataSource.manager.findOne(Dkp, { where: { DiscordId } });

  if (!user) {
    const newUser = new Dkp();
    newUser.DiscordId = DiscordId;
    newUser.EarnedDkp = 5;
    newUser.SpentDkp = 0;
    await AppDataSource.manager.save(newUser);
    return `Welcome to the guild!`;
  }
  return null;
}

export function formatField(field: string[]): string {
  return field.join('\n');
}
