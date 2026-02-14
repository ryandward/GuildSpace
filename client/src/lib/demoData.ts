/**
 * Procedural demo data generator for "Look Around" mode.
 * Deterministic (seeded PRNG), lazy-loaded, zero server calls.
 */

// --- Seeded PRNG (mulberry32) ---
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Constants ---

const CLASSES = [
  'Cleric', 'Warrior', 'Wizard', 'Magician', 'Enchanter',
  'Necromancer', 'Shadow Knight', 'Rogue', 'Ranger', 'Druid',
  'Monk', 'Bard', 'Paladin', 'Shaman', 'Warlock',
];

const FIRST_NAMES = [
  'Aelindra', 'Brogan', 'Caelith', 'Durnok', 'Elara',
  'Faelan', 'Grimshaw', 'Halvard', 'Isolde', 'Jareth',
  'Kaelum', 'Lyris', 'Mordain', 'Nythara', 'Orinvex',
  'Pyrion', 'Quelara', 'Ravek', 'Sylvaine', 'Thandril',
  'Ulvaine', 'Vashira', 'Wynthor', 'Xandiel', 'Ysolde',
  'Zephyran', 'Arken', 'Belvaine', 'Cyreth', 'Delvara',
  'Elthain', 'Fenwick', 'Galvorn', 'Hestia', 'Ildrin',
  'Jorvath', 'Kelthane', 'Lunareth', 'Maelis', 'Norivex',
  'Othrane', 'Pellion', 'Quethar', 'Rylind', 'Seravix',
  'Thexian', 'Umbriel', 'Veldrin', 'Wyneth', 'Xaelen',
  'Yrathis', 'Zolvane', 'Ashveil', 'Brinara', 'Corvath',
  'Dariel', 'Eshara', 'Fynrath', 'Galdris', 'Helmara',
  'Ivorn', 'Jyneth', 'Kolvane', 'Lithara', 'Morwen',
  'Neldris', 'Orvaine', 'Praelin', 'Quinthar', 'Roseveil',
  'Stormael', 'Thalvex', 'Ulric', 'Verdaine', 'Welkor',
  'Xilvane', 'Yundris', 'Zethara', 'Alveron', 'Braevil',
  'Cindrel', 'Dravex', 'Essara', 'Folvaine', 'Grenthos',
  'Haldrik', 'Indara', 'Jeldrin', 'Krevane', 'Lythion',
  'Marvex', 'Noleth', 'Ondris', 'Phaelix', 'Relvaine',
  'Shaldrik', 'Trevane', 'Valdris', 'Wynvex', 'Zarevil',
];

const DISPLAY_NAMES = [
  'CriticalHit', 'Tankzilla', 'HealBot3000', 'ShadowDancer', 'FireStorm',
  'IceMage', 'StealthKill', 'DragonSlayer', 'NightBlade', 'HolySmite',
  'ArrowRain', 'BearForm', 'SkullCrush', 'WindRunner', 'ChainHeal',
  'DarkPact', 'MoonFire', 'BloodRage', 'SoulSiphon', 'ThunderClap',
  'VenomStrike', 'FrostBolt', 'SunBeam', 'IronShield', 'SwiftBlade',
  'DeathGrip', 'NatureCall', 'ArcaneBlast', 'WildShape', 'DivineLight',
  'RogueAgent', 'SpellWeave', 'BeastMaster', 'GhostWalk', 'TempestFury',
  'EarthShaker', 'SilverArrow', 'DoomBringer', 'LifeTap', 'BladeSong',
  'RuneCaster', 'PhantomEdge', 'CelestialAura', 'VoidWalker', 'SteelNerve',
  'EmberGlow', 'TidalForce', 'CrimsonBlade', 'MysticEye', 'WarCry',
  'PlagueTouch', 'LightBringer', 'DarkWhisper', 'FlameKnight', 'FrostWeave',
  'StoneGuard', 'RavenClaw', 'SparkMage', 'ThornsPath', 'SilentStep',
  'BoneCollector', 'StarFall', 'IronWill', 'PoisonTip', 'HolyWrath',
  'NightHowl', 'OceanDeep', 'SkyPiercer', 'RootGrasp', 'ChaosBolt',
  'ShieldWall', 'QuickDraw', 'SpiritBond', 'LavaFlow', 'TwilightVeil',
  'CrystalEdge', 'StormCaller', 'GrimReaper', 'AuraKnight', 'SongBird',
  'ThornMage', 'WildFang', 'BrightStar', 'ShadowMend', 'ManaPool',
  'RageFist', 'SereneBlade', 'GhoulTouch', 'WindScar', 'ArmorPierce',
  'MoonShadow', 'FireDance', 'IceShard', 'SunStrike', 'DeepRoot',
  'BlitzKrieg', 'CalmWaters', 'DarkFlame', 'EchoMage', 'FuryBlade',
];

const RAID_NAMES = [
  'Plane of Fear', 'Plane of Hate', 'Plane of Sky',
  'Nagafen\'s Lair', 'Veeshan\'s Peak', 'Temple of Veeshan',
  'Kael Drakkel', 'Sleeper\'s Tomb', 'Plane of Growth',
  'Plane of Mischief', 'Ssraeshza Temple', 'Vex Thal',
];

const ITEM_NAMES = [
  'Cloak of Flames', 'Blade of Carnage', 'Crown of Deceit',
  'Gloves of the Unseen', 'Boots of the Traveler', 'Ring of Valor',
  'Amulet of Necropotence', 'Staff of the Serpent', 'Shield of the Immaculate',
  'Helm of the Tracker', 'Gauntlets of Fiery Might', 'Robe of the Oracle',
  'Belt of Dwarf Slaying', 'Earring of Station', 'Bracelet of the Shadow',
  'Leggings of the Blue Wolf', 'Mantle of the Rainmaker', 'Circlet of Shadow',
  'Necklace of Resolution', 'Torn Mantle of the Tempest',
  'Crystalline Short Sword', 'Wand of Allure', 'Mace of the Shadowed',
  'Spear of Impaling', 'Orb of Mastery', 'Hammer of the Dragonborn',
  'Axe of the Iron Back', 'Dagger of the Arcane', 'Crossbow of the Relentless',
  'Bracer of Hammerfal', 'Tunic of the Lost', 'Pauldrons of the Deep',
  'Greaves of the Chosen', 'Cape of the Dire Wolf', 'Sash of the Fallen',
  'Mask of Tinkering', 'Vest of the Inferno', 'Tome of Oblivion',
  'Talisman of the Brute', 'Idol of the Thorned', 'Pearl of Wisdom',
  'Bone Chips', 'Words of Collection (Beza)', 'Peridot', 'Star Ruby',
  'Black Sapphire', 'Blue Diamond', 'Flawed Emerald', 'Fire Opal',
  'Jade Shard', 'Rune of Attraction', 'Words of Dimension',
  'Spell: Aegolism', 'Spell: Torpor', 'Spell: Koadic\'s Endless Intellect',
  'Block of Velium', 'Velium Hound Fur', 'Wyvern Hide', 'Lava Rock',
  'Drake Fang', 'Ancient Platinum Dragon Tooth', 'Gem of Empowerment',
  'Orb of the Infinite Void', 'Scepter of Shadows',
  'Deepwater Ink', 'Shimmering Pearl', 'Essence of Rathe',
  'Crystalized Mana Shard', 'Runed Bolster Belt',
  'Frost Giant Toes', 'Ice Giant Toes', 'Hill Giant Toes',
  'Kunzar Amulet', 'Scaled Wolf Hide', 'Spider Silk',
  'Wurm Meat', 'Drake Meat', 'Bear Meat', 'Giant Snake Fang',
];

const BANK_LOCATIONS = [
  'General 1', 'General 2', 'General 3', 'General 4',
  'General 5', 'General 6', 'General 7', 'General 8',
  'Bank Slot 1', 'Bank Slot 2', 'Bank Slot 3', 'Bank Slot 4',
  'Bank Slot 5', 'Bank Slot 6', 'Bank Slot 7', 'Bank Slot 8',
];

const BIOS = [
  'Veteran raider since Classic. Love the guild vibe.',
  'Just here to smash stuff and get loot.',
  'The heals must flow.',
  'Leader of the Wednesday night crew.',
  'I play too much. Send help.',
  'Alt-aholic extraordinaire.',
  'Former officer of Dawn Crusaders.',
  'Returned player from 2001. Loving the nostalgia.',
  'Tank main, healer alt. Never a DPS.',
  'Crafting is the real endgame.',
  'Proud owner of 47 alts.',
  'My epic 1.0 took 3 months and I\'d do it again.',
  'Gnome master race.',
  'Dark elf for life.',
  'Why does everyone need a cleric?',
  'Yes I actually enjoy corpse runs.',
  'Have boat, will travel.',
  'Still looking for the Guise of the Deceiver.',
  'Raid or die.',
  'Part-time enchanter, full-time charmer.',
];

// --- Data Generation ---

interface DemoCharacter {
  name: string;
  class: string;
  level: number;
  status: string;
  lastRaidDate: string | null;
}

interface DemoMember {
  discordId: string;
  displayName: string;
  bio: string | null;
  isOfficer: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  officerSince: string | null;
  adminSince: string | null;
  joinedAt: string | null;
  characters: DemoCharacter[];
  mainName: string | null;
  mainClass: string | null;
  mainLevel: number | null;
  earnedDkp: number;
  spentDkp: number;
  hasGuildSpace: boolean;
}

function generateDate(daysAgo: number): string {
  const d = new Date('2026-02-14T00:00:00Z');
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randInt(18, 23), randInt(0, 59), randInt(0, 59));
  return d.toISOString();
}

function generateMembers(): DemoMember[] {
  const usedNames = new Set<string>();
  const names = shuffle(FIRST_NAMES);
  const displayNames = shuffle(DISPLAY_NAMES);
  const members: DemoMember[] = [];

  for (let i = 0; i < 100; i++) {
    const discordId = `demo_${String(i).padStart(3, '0')}`;
    const displayName = displayNames[i];
    const isOwner = i === 0;
    const isAdmin = i === 1;
    const isOfficer = i < 5;

    // 1-4 characters per member
    const charCount = rand() < 0.5 ? 1 : rand() < 0.7 ? 2 : rand() < 0.9 ? 3 : 4;
    const characters: DemoCharacter[] = [];

    for (let c = 0; c < charCount; c++) {
      let name = names.pop()!;
      while (usedNames.has(name)) name = names.pop()!;
      usedNames.add(name);

      const cls = pick(CLASSES);
      const isMain = c === 0;
      const status = isMain ? 'Main' : rand() < 0.3 ? 'Bot' : 'Alt';

      // ~70% of mains at 60, rest 30-59
      const level = isMain
        ? (rand() < 0.7 ? 60 : randInt(30, 59))
        : (rand() < 0.4 ? 60 : randInt(15, 55));

      const lastRaidDate = rand() < 0.8
        ? generateDate(randInt(0, 60))
        : null;

      characters.push({ name, class: cls, level, status, lastRaidDate });
    }

    const mainChar = characters.find(c => c.status === 'Main')!;

    // DKP: power-law distribution
    const earned = Math.round(Math.pow(rand(), 0.5) * 800);
    const spent = Math.round(rand() * earned * 0.6);

    const bio = rand() < 0.2 ? pick(BIOS) : null;
    const joinedAt = generateDate(randInt(30, 365));

    members.push({
      discordId,
      displayName,
      bio,
      isOfficer, isAdmin, isOwner,
      officerSince: isOfficer ? generateDate(randInt(60, 300)) : null,
      adminSince: isAdmin || isOwner ? generateDate(randInt(100, 350)) : null,
      joinedAt,
      characters,
      mainName: mainChar.name,
      mainClass: mainChar.class,
      mainLevel: mainChar.level,
      earnedDkp: earned,
      spentDkp: spent,
      hasGuildSpace: rand() < 0.7,
    });
  }

  return members;
}

// Build once on first access
let _members: DemoMember[] | null = null;
function getMembers(): DemoMember[] {
  if (!_members) _members = generateMembers();
  return _members;
}

// --- Raid Events ---

interface DemoCall {
  id: number;
  raidName: string;
  modifier: number;
  recordedCount: number;
  rejectedCount: number;
  createdBy: string;
  createdAt: string;
  attendees: { characterName: string; discordId: string; characterClass: string | null }[];
}

interface DemoEvent {
  id: number;
  name: string;
  status: string;
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
  calls: DemoCall[];
  memberAttendance: {
    discordId: string;
    displayName: string;
    mainClass: string | null;
    callsPresent: number[];
    totalDkp: number;
    hasGuildSpace: boolean;
  }[];
}

function generateEvents(): DemoEvent[] {
  const members = getMembers();
  const events: DemoEvent[] = [];

  const eventNames = [
    'Plane of Fear Clear', 'Tuesday Night Hate', 'VP Key Run',
    'Kael Drakkel Push', 'Weekend Sky Clear',
  ];

  let callIdCounter = 1;

  for (let e = 0; e < 5; e++) {
    const eventId = e + 1;
    const status = e < 4 ? 'closed' : 'active';
    const createdAt = generateDate(e * 7 + randInt(0, 3));
    const closedAt = status === 'closed' ? generateDate(e * 7 - 1) : null;

    // 3-8 calls per event
    const callCount = randInt(3, 8);
    const calls: DemoCall[] = [];

    // Pick a random subset of members for this event (30-80%)
    const attendanceRate = 0.3 + rand() * 0.5;
    const eventMembers = members.filter(() => rand() < attendanceRate);

    for (let c = 0; c < callCount; c++) {
      const callId = callIdCounter++;
      const raidName = pick(RAID_NAMES);
      const modifier = pick([1, 1, 1, 2, 2, 3]);

      // Each call has a subset of the event's members
      const callAttendees = eventMembers
        .filter(() => rand() < 0.75)
        .map(m => {
          const mainChar = m.characters[0];
          return {
            characterName: mainChar.name,
            discordId: m.discordId,
            characterClass: mainChar.class,
          };
        });

      calls.push({
        id: callId,
        raidName,
        modifier,
        recordedCount: callAttendees.length,
        rejectedCount: randInt(0, 3),
        createdBy: 'demo_000',
        createdAt: generateDate(e * 7 + c),
        attendees: callAttendees,
      });
    }

    // Build per-member attendance matrix
    const memberAttendance = eventMembers.map(m => {
      const presentCalls = calls
        .filter(call => call.attendees.some(a => a.discordId === m.discordId))
        .map(call => call.id);
      const totalDkp = calls
        .filter(call => presentCalls.includes(call.id))
        .reduce((sum, call) => sum + call.modifier, 0);

      return {
        discordId: m.discordId,
        displayName: m.displayName,
        mainClass: m.mainClass,
        callsPresent: presentCalls,
        totalDkp,
        hasGuildSpace: m.hasGuildSpace,
      };
    });

    events.push({
      id: eventId,
      name: eventNames[e],
      status,
      createdBy: 'demo_000',
      createdAt,
      closedAt,
      calls,
      memberAttendance,
    });
  }

  return events;
}

let _events: DemoEvent[] | null = null;
function getEvents(): DemoEvent[] {
  if (!_events) _events = generateEvents();
  return _events;
}

// --- Bank ---

interface DemoBankItem {
  name: string;
  totalQuantity: number;
  bankers: string[];
  slots: { banker: string; location: string; quantity: number }[];
}

function generateBank(): { items: DemoBankItem[]; bankers: string[] } {
  const bankerNames = ['Banksworth', 'Vaultheart', 'Stashkeeper'];
  const items: DemoBankItem[] = [];
  const usedItems = shuffle(ITEM_NAMES).slice(0, 80);

  for (const itemName of usedItems) {
    const numBankers = rand() < 0.7 ? 1 : 2;
    const itemBankers = shuffle(bankerNames).slice(0, numBankers);
    const slots = itemBankers.map(banker => ({
      banker,
      location: pick(BANK_LOCATIONS),
      quantity: randInt(1, 20),
    }));

    items.push({
      name: itemName,
      totalQuantity: slots.reduce((s, sl) => s + sl.quantity, 0),
      bankers: itemBankers,
      slots,
    });
  }

  return { items, bankers: bankerNames };
}

let _bank: { items: DemoBankItem[]; bankers: string[] } | null = null;
function getBank() {
  if (!_bank) _bank = generateBank();
  return _bank;
}

// --- Templates ---

function getTemplates() {
  return [
    { name: 'Plane of Fear', type: 'raid', modifier: 2 },
    { name: 'Plane of Hate', type: 'raid', modifier: 2 },
    { name: 'Plane of Sky', type: 'raid', modifier: 3 },
    { name: 'Nagafen', type: 'boss', modifier: 1 },
    { name: 'Vox', type: 'boss', modifier: 1 },
    { name: 'Kael Drakkel', type: 'raid', modifier: 2 },
  ];
}

// --- Bank History ---

function generateBankHistory() {
  const { bankers } = getBank();
  const members = getMembers();
  const records = [];

  for (let i = 0; i < 8; i++) {
    const banker = bankers[i % bankers.length];
    const uploader = pick(members.filter(m => m.isOfficer));
    records.push({
      id: `import_${i + 1}`,
      banker,
      uploadedBy: uploader.discordId,
      uploadedByName: uploader.displayName,
      itemCount: randInt(20, 60),
      diff: {
        added: [{ name: pick(ITEM_NAMES), quantity: randInt(1, 5) }],
        removed: rand() < 0.3 ? [{ name: pick(ITEM_NAMES), quantity: randInt(1, 3) }] : [],
        changed: rand() < 0.5 ? [{ name: pick(ITEM_NAMES), oldQuantity: randInt(1, 5), newQuantity: randInt(6, 15) }] : [],
      },
      createdAt: generateDate(i * 3 + randInt(0, 2)),
    });
  }

  return records;
}

let _bankHistory: ReturnType<typeof generateBankHistory> | null = null;
function getBankHistory() {
  if (!_bankHistory) _bankHistory = generateBankHistory();
  return _bankHistory;
}

// --- URL Router ---

export function getDemoResponse(url: string, method: string): unknown | null {
  if (method !== 'GET') return null; // mutations not allowed

  // Strip query string for matching
  const [path, queryString] = url.split('?');
  const params = new URLSearchParams(queryString || '');

  // GET /api/roster
  if (path === '/api/roster') {
    const members = getMembers();
    const classCounts: Record<string, number> = {};
    let totalChars = 0;
    for (const m of members) {
      for (const c of m.characters) {
        classCounts[c.class] = (classCounts[c.class] || 0) + 1;
        totalChars++;
      }
    }
    return {
      members: members.map(m => ({
        discordId: m.discordId,
        displayName: m.displayName,
        characters: m.characters,
        mainName: m.mainName,
        mainClass: m.mainClass,
        mainLevel: m.mainLevel,
        earnedDkp: m.earnedDkp,
        spentDkp: m.spentDkp,
        hasGuildSpace: m.hasGuildSpace,
        isOfficer: m.isOfficer,
      })),
      summary: {
        totalMembers: members.length,
        totalCharacters: totalChars,
        classCounts,
      },
    };
  }

  // GET /api/roster/:id
  const memberMatch = path.match(/^\/api\/roster\/(.+)$/);
  if (memberMatch) {
    const id = decodeURIComponent(memberMatch[1]);
    const m = getMembers().find(m => m.discordId === id);
    if (!m) return null;

    // Build dkpByCharacter
    const dkpByCharacter = m.characters.map(c => ({
      name: c.name,
      class: c.class,
      totalDkp: Math.round(m.earnedDkp / m.characters.length),
      raidCount: randInt(5, 40),
    }));

    return {
      discordId: m.discordId,
      displayName: m.displayName,
      bio: m.bio,
      isOfficer: m.isOfficer,
      isAdmin: m.isAdmin,
      isOwner: m.isOwner,
      officerSince: m.officerSince,
      adminSince: m.adminSince,
      joinedAt: m.joinedAt,
      characters: m.characters,
      earnedDkp: m.earnedDkp,
      spentDkp: m.spentDkp,
      dkpByCharacter,
    };
  }

  // GET /api/raids/events
  if (path === '/api/raids/events') {
    const status = params.get('status');
    let events = getEvents();
    if (status) events = events.filter(e => e.status === status);
    return events.map(e => ({
      id: e.id,
      name: e.name,
      status: e.status,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      closedAt: e.closedAt,
      callCount: e.calls.length,
      totalDkp: e.calls.reduce((s, c) => s + c.modifier, 0),
      memberCount: e.memberAttendance.length,
    }));
  }

  // GET /api/raids/events/:id
  const eventMatch = path.match(/^\/api\/raids\/events\/(\d+)$/);
  if (eventMatch) {
    const id = parseInt(eventMatch[1], 10);
    const ev = getEvents().find(e => e.id === id);
    if (!ev) return null;
    return {
      event: {
        id: ev.id,
        name: ev.name,
        status: ev.status,
        createdBy: ev.createdBy,
        createdAt: ev.createdAt,
        closedAt: ev.closedAt,
      },
      calls: ev.calls,
      members: ev.memberAttendance,
    };
  }

  // GET /api/raids/templates
  if (path === '/api/raids/templates') {
    return getTemplates();
  }

  // GET /api/bank
  if (path === '/api/bank') {
    return getBank().items;
  }

  // GET /api/bank/history
  if (path === '/api/bank/history') {
    return getBankHistory();
  }

  // GET /api/bank/:banker/history
  const bankerHistMatch = path.match(/^\/api\/bank\/(.+)\/history$/);
  if (bankerHistMatch) {
    const banker = decodeURIComponent(bankerHistMatch[1]);
    return getBankHistory().filter(h => h.banker === banker);
  }

  // GET /api/toons/mine
  if (path === '/api/toons/mine') {
    return [];
  }

  // GET /api/toons/search
  if (path === '/api/toons/search') {
    return [];
  }

  // GET /api/commands — return empty list for demo
  if (path === '/api/commands') {
    return [];
  }

  return null;
}
