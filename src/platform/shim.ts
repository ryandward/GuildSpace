/**
 * Discord.js compatibility shim.
 *
 * Commands can change:
 *   import { SlashCommandBuilder, EmbedBuilder, ... } from 'discord.js';
 * to:
 *   import { SlashCommandBuilder, EmbedBuilder, ... } from '../../platform/shim.js';
 *
 * and everything else stays the same.
 *
 * @module
 */
export {
  PlatformCommandBuilder as SlashCommandBuilder,
  PlatformEmbed as EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from './types.js';

export type {
  CommandInteraction as ChatInputCommandInteraction,
  AutocompleteInteraction,
  ModalSubmitInteraction,
  ComponentInteraction,
} from './types.js';

// ─── Component Builders (chainable, like discord.js) ─────────────────────────

import type { Button, SelectMenu, SelectOption, ActionRow, ButtonStyle as BtnStyle } from './types.js';

export class ButtonBuilder {
  private btn: Button = { type: 'button', customId: '', label: '', style: 'Primary' };

  setCustomId(id: string): this { this.btn.customId = id; return this; }
  setLabel(label: string): this { this.btn.label = label; return this; }
  setStyle(style: number | BtnStyle | string): this {
    // Map discord.js ButtonStyle enum values to our strings
    const styleMap: Record<number | string, BtnStyle> = {
      1: 'Primary', 2: 'Secondary', 3: 'Success', 4: 'Danger', 5: 'Link',
      'Primary': 'Primary', 'Secondary': 'Secondary', 'Success': 'Success',
      'Danger': 'Danger', 'Link': 'Link',
    };
    this.btn.style = styleMap[String(style)] ?? 'Primary';
    return this;
  }
  setDisabled(disabled: boolean): this { this.btn.disabled = disabled; return this; }
  build(): Button { return { ...this.btn }; }
  toJSON(): Button { return this.build(); }
}

export class StringSelectMenuBuilder {
  private menu: SelectMenu = { type: 'select', customId: '', options: [] };

  setCustomId(id: string): this { this.menu.customId = id; return this; }
  setPlaceholder(ph: string): this { this.menu.placeholder = ph; return this; }
  addOptions(...options: (SelectOption | SelectOption[])[]): this {
    const flat = options.flat();
    this.menu.options.push(...flat);
    return this;
  }
  setMinValues(n: number): this { this.menu.minValues = n; return this; }
  setMaxValues(n: number): this { this.menu.maxValues = n; return this; }
  build(): SelectMenu { return { ...this.menu }; }
  toJSON(): SelectMenu { return this.build(); }
}

/**
 * ActionRowBuilder mimics discord.js pattern.
 * In discord.js it's generic: ActionRowBuilder<ButtonBuilder> etc.
 * Here it just collects components.
 */
export class ActionRowBuilder<T extends { build(): unknown } = { build(): unknown }> {
  private components: T[] = [];

  addComponents(...components: T[]): this {
    this.components.push(...components);
    return this;
  }

  toJSON(): ActionRow {
    return this.components.map(c => c.build()) as ActionRow;
  }
}

// ─── Modal Builders ──────────────────────────────────────────────────────────

import type { ModalDefinition, ModalField } from './types.js';

export class TextInputBuilder {
  private field: ModalField = { customId: '', label: '', style: 'short' };

  setCustomId(id: string): this { this.field.customId = id; return this; }
  setLabel(label: string): this { this.field.label = label; return this; }
  setStyle(style: number | 'short' | 'paragraph' | string): this {
    // discord.js TextInputStyle: Short=1, Paragraph=2
    if (style === 2 || style === 'Paragraph' || style === 'paragraph') {
      this.field.style = 'paragraph';
    } else {
      this.field.style = 'short';
    }
    return this;
  }
  setPlaceholder(ph: string): this { this.field.placeholder = ph; return this; }
  setRequired(req: boolean): this { this.field.required = req; return this; }
  setValue(val: string): this { this.field.value = val; return this; }
  build(): ModalField { return { ...this.field }; }
}

export class ModalBuilder {
  private modal: ModalDefinition = { customId: '', title: '', fields: [] };

  setCustomId(id: string): this { this.modal.customId = id; return this; }
  setTitle(title: string): this { this.modal.title = title; return this; }
  addComponents(...rows: ActionRowBuilder<TextInputBuilder>[]): this {
    for (const row of rows) {
      const fields = row.toJSON() as unknown as ModalField[];
      for (const field of fields) {
        this.modal.fields.push(field);
      }
    }
    return this;
  }
  build(): ModalDefinition { return { ...this.modal }; }
  toJSON(): ModalDefinition { return this.build(); }
}

// ─── Enum Shims ──────────────────────────────────────────────────────────────

/** Maps discord.js ButtonStyle enum */
export const ButtonStyle = {
  Primary: 'Primary' as BtnStyle,
  Secondary: 'Secondary' as BtnStyle,
  Success: 'Success' as BtnStyle,
  Danger: 'Danger' as BtnStyle,
  Link: 'Link' as BtnStyle,
} as const;

/** Maps discord.js TextInputStyle enum */
export const TextInputStyle = {
  Short: 'short',
  Paragraph: 'paragraph',
} as const;

/** Maps discord.js GatewayIntentBits (not needed for web, but prevents import errors) */
export const GatewayIntentBits = {
  Guilds: 0,
  GuildMessages: 0,
  MessageContent: 0,
} as const;

/** TextChannel shim for commands that reference it */
export type TextChannel = any;
