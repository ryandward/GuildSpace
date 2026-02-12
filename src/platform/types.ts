/**
 * Platform-agnostic interaction types.
 *
 * These interfaces mirror the subset of discord.js that the bot actually uses,
 * but with no dependency on Discord. Commands import from here instead of
 * discord.js, and the platform adapter (Discord or Web) provides implementations.
 *
 * @module
 */

// ─── Embed ───────────────────────────────────────────────────────────────────

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export type EmbedColor = 'Green' | 'Red' | 'Blue' | 'Yellow' | 'Orange' | 'Purple' | string;

export interface Embed {
  title?: string;
  description?: string;
  color?: EmbedColor;
  fields: EmbedField[];
  timestamp?: string;
  footer?: { text: string };
  thumbnail?: { url: string };
  image?: { url: string };
}

export class PlatformEmbed implements Embed {
  title?: string;
  description?: string;
  color?: EmbedColor;
  fields: EmbedField[] = [];
  timestamp?: string;
  footer?: { text: string };
  thumbnail?: { url: string };
  image?: { url: string };

  setTitle(title: string): this {
    this.title = title;
    return this;
  }
  setDescription(desc: string): this {
    this.description = desc;
    return this;
  }
  setColor(color: EmbedColor): this {
    this.color = color;
    return this;
  }
  addFields(...fields: EmbedField[]): this {
    this.fields.push(...fields);
    return this;
  }
  setTimestamp(): this {
    this.timestamp = new Date().toISOString();
    return this;
  }
  setFooter(footer: { text: string }): this {
    this.footer = footer;
    return this;
  }
  setThumbnail(url: string): this {
    this.thumbnail = { url };
    return this;
  }
  setImage(url: string): this {
    this.image = { url };
    return this;
  }
}

// ─── Components ──────────────────────────────────────────────────────────────

export type ButtonStyle = 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link';

export interface Button {
  type: 'button';
  customId: string;
  label: string;
  style: ButtonStyle;
  disabled?: boolean;
}

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

export interface SelectMenu {
  type: 'select';
  customId: string;
  placeholder?: string;
  options: SelectOption[];
  minValues?: number;
  maxValues?: number;
}

export type Component = Button | SelectMenu;
export type ActionRow = Component[];

// ─── Command Definition ──────────────────────────────────────────────────────

export type OptionType = 'string' | 'integer' | 'boolean' | 'user' | 'number';

export interface CommandOption {
  name: string;
  description: string;
  type: OptionType;
  required?: boolean;
  autocomplete?: boolean;
  minValue?: number;
  maxValue?: number;
  maxLength?: number;
  choices?: { name: string; value: string | number }[];
}

export interface CommandDefinition {
  name: string;
  description: string;
  options: CommandOption[];
  defaultPermission?: string; // e.g. 'ManageRoles', 'ManageGuild'
}

// Builder that mirrors SlashCommandBuilder's chainable API
export class PlatformCommandBuilder {
  private def: CommandDefinition = { name: '', description: '', options: [] };

  setName(name: string): this {
    this.def.name = name;
    return this;
  }
  setDescription(desc: string): this {
    this.def.description = desc;
    return this;
  }
  setDefaultMemberPermissions(_bits: bigint | number): this {
    // We'll map known Discord permission bits to string names
    // ManageRoles = 0x10000000 = 268435456
    // ManageGuild = 0x00000020 = 32
    const bits = Number(_bits);
    if (bits === 268435456) this.def.defaultPermission = 'ManageRoles';
    else if (bits === 32) this.def.defaultPermission = 'ManageGuild';
    else this.def.defaultPermission = 'Admin';
    return this;
  }

  addStringOption(fn: (opt: StringOptionBuilder) => StringOptionBuilder): this {
    const opt = fn(new StringOptionBuilder());
    this.def.options.push(opt.build());
    return this;
  }
  addIntegerOption(fn: (opt: IntegerOptionBuilder) => IntegerOptionBuilder): this {
    const opt = fn(new IntegerOptionBuilder());
    this.def.options.push(opt.build());
    return this;
  }
  addBooleanOption(fn: (opt: BooleanOptionBuilder) => BooleanOptionBuilder): this {
    const opt = fn(new BooleanOptionBuilder());
    this.def.options.push(opt.build());
    return this;
  }
  addUserOption(fn: (opt: UserOptionBuilder) => UserOptionBuilder): this {
    const opt = fn(new UserOptionBuilder());
    this.def.options.push(opt.build());
    return this;
  }
  addNumberOption(fn: (opt: NumberOptionBuilder) => NumberOptionBuilder): this {
    const opt = fn(new NumberOptionBuilder());
    this.def.options.push(opt.build());
    return this;
  }

  /** Expose the name for the command registry */
  get name(): string {
    return this.def.name;
  }

  toJSON(): CommandDefinition {
    return { ...this.def };
  }
}

class BaseOptionBuilder<T extends BaseOptionBuilder<T>> {
  protected opt: CommandOption = { name: '', description: '', type: 'string' };

  setName(name: string): T {
    this.opt.name = name;
    return this as unknown as T;
  }
  setDescription(desc: string): T {
    this.opt.description = desc;
    return this as unknown as T;
  }
  setRequired(required: boolean): T {
    this.opt.required = required;
    return this as unknown as T;
  }
  build(): CommandOption {
    return { ...this.opt };
  }
}

class StringOptionBuilder extends BaseOptionBuilder<StringOptionBuilder> {
  constructor() {
    super();
    this.opt.type = 'string';
  }
  setAutocomplete(ac: boolean): this {
    this.opt.autocomplete = ac;
    return this;
  }
  setMaxLength(len: number): this {
    this.opt.maxLength = len;
    return this;
  }
  addChoices(...choices: { name: string; value: string }[]): this {
    this.opt.choices = choices;
    return this;
  }
}

class IntegerOptionBuilder extends BaseOptionBuilder<IntegerOptionBuilder> {
  constructor() {
    super();
    this.opt.type = 'integer';
  }
  setMinValue(v: number): this {
    this.opt.minValue = v;
    return this;
  }
  setMaxValue(v: number): this {
    this.opt.maxValue = v;
    return this;
  }
}

class BooleanOptionBuilder extends BaseOptionBuilder<BooleanOptionBuilder> {
  constructor() {
    super();
    this.opt.type = 'boolean';
  }
}

class UserOptionBuilder extends BaseOptionBuilder<UserOptionBuilder> {
  constructor() {
    super();
    this.opt.type = 'user';
  }
}

class NumberOptionBuilder extends BaseOptionBuilder<NumberOptionBuilder> {
  constructor() {
    super();
    this.opt.type = 'number';
  }
  setMinValue(v: number): this {
    this.opt.minValue = v;
    return this;
  }
  setMaxValue(v: number): this {
    this.opt.maxValue = v;
    return this;
  }
}

// ─── Interaction Interfaces ──────────────────────────────────────────────────

/** Resolved option value from a command invocation */
export interface ResolvedOption {
  value: string | number | boolean;
  name: string;
  type: OptionType;
}

export interface InteractionUser {
  id: string;
  username: string;
  displayName?: string;
}

export interface InteractionOptions {
  get(name: string): ResolvedOption | null;
  getString(name: string, required?: boolean): string | null;
  getInteger(name: string, required?: boolean): number | null;
  getBoolean(name: string, required?: boolean): boolean | null;
  /** For autocomplete: returns the currently focused option's partial value */
  getFocused(full?: boolean): string | { name: string; value: string };
}

export interface ReplyOptions {
  content?: string;
  embeds?: Embed[];
  components?: ActionRow[];
  ephemeral?: boolean;
  flags?: number;
  files?: { name: string; data: Buffer | string }[];
}

export interface ModalField {
  customId: string;
  label: string;
  style: 'short' | 'paragraph';
  placeholder?: string;
  required?: boolean;
  value?: string;
}

export interface ModalDefinition {
  customId: string;
  title: string;
  fields: ModalField[];
}

/**
 * The core interaction interface that commands receive.
 * This replaces ChatInputCommandInteraction from discord.js.
 */
export interface CommandInteraction {
  user: InteractionUser;
  options: InteractionOptions;
  commandName: string;
  /** Guild/server context */
  guildId?: string;
  /** User's permissions in this guild */
  memberPermissions?: Set<string>;

  reply(options: ReplyOptions | string): Promise<void>;
  editReply(options: ReplyOptions | string): Promise<void>;
  deferReply(): Promise<void>;
  deleteReply(): Promise<void>;
  followUp(options: ReplyOptions | string): Promise<void>;
  showModal(modal: ModalDefinition): Promise<void>;
}

/**
 * Autocomplete interaction — sent while user is typing an option value.
 */
export interface AutocompleteInteraction {
  user: InteractionUser;
  options: InteractionOptions;
  commandName: string;
  respond(choices: { name: string; value: string }[]): Promise<void>;
}

/**
 * Modal submit interaction — sent when user submits a modal form.
 */
export interface ModalSubmitInteraction {
  user: InteractionUser;
  customId: string;
  fields: {
    getTextInputValue(customId: string): string;
  };

  reply(options: ReplyOptions | string): Promise<void>;
  editReply(options: ReplyOptions | string): Promise<void>;
  deferReply(): Promise<void>;
}

/**
 * Component interaction — sent when user clicks a button or select menu.
 */
export interface ComponentInteraction {
  user: InteractionUser;
  customId: string;
  /** For select menus */
  values?: string[];

  isStringSelectMenu(): boolean;
  update(options: ReplyOptions | string): Promise<void>;
}

/**
 * Collector that waits for a component interaction on the reply.
 * Replaces discord.js awaitMessageComponent.
 */
export interface ComponentCollector {
  awaitComponent(filter: (i: ComponentInteraction) => boolean, timeout: number): Promise<ComponentInteraction | null>;
}

// ─── Command Module Interface ────────────────────────────────────────────────

export interface PlatformCommand {
  data: PlatformCommandBuilder;
  execute?(interaction: CommandInteraction): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
  handleModal?(interaction: ModalSubmitInteraction): Promise<void>;
}

// ─── Platform Services ───────────────────────────────────────────────────────

/**
 * Guild-level operations that commands can use.
 * Replaces direct Discord guild/member/role API calls.
 */
export interface GuildService {
  getMember(guildId: string, userId: string): Promise<{ id: string; roles: string[]; displayName: string } | null>;
  addRole(guildId: string, userId: string, roleId: string): Promise<void>;
  removeRole(guildId: string, userId: string, roleId: string): Promise<void>;
  sendToChannel(channelId: string, options: ReplyOptions | string): Promise<void>;
}

// Re-export the MessageFlags equivalent
export const MessageFlags = {
  Ephemeral: 64,
} as const;

// Re-export PermissionFlagsBits equivalent
export const PermissionFlagsBits = {
  ManageRoles: 268435456,
  ManageGuild: 32,
  Administrator: 8,
} as const;
