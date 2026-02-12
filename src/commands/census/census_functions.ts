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

export async function levelMustBeValid(Level: number) {
  if (Level < 1 || Level > 60) throw new Error(':x: Level must be between 1 and 60.');
  return Level;
}

export async function toonMustExist(Name: string) {
  const toon = await AppDataSource.manager.findOne(Census, { where: { Name } });
  if (!toon) throw new Error(`:x: ${Name} does not exist, please complete all fields.`);
  return toon;
}

export async function toonMustNotExist(Name: string) {
  const toon = await AppDataSource.manager.findOne(Census, { where: { Name } });
  if (toon) throw new Error(`:x: ${Name} already exists.`);
  return toon;
}

export async function classMustExist(CharacterClass: string) {
  const classEntered = await AppDataSource.manager.findOne(ClassDefinitions, {
    where: { CharacterClass },
  });
  if (!classEntered) throw new Error(`:x: ${CharacterClass} is not a valid class.`);
  return classEntered;
}

export async function userMustExist(UserId: string) {
  const user = await AppDataSource.manager.findOne(Dkp, { where: { DiscordId: UserId } });
  if (!user) throw new Error(`:x: ${UserId} is not in the DKP database.`);
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

export function formatField(field: string[]): string {
  return field.join('\n');
}
