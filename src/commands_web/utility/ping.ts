/**
 * `/ping` command — confirms the server is alive.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from '../../platform/shim.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with pong.');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply('🏓 Pong!');
}
