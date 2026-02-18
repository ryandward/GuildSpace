export interface SlotDef {
  key: string;
  label: string;
  gridArea: string;
}

export const WORN_SLOTS: SlotDef[] = [
  { key: 'Ear1',      label: 'Ear',       gridArea: 'ear1' },
  { key: 'Head',      label: 'Head',      gridArea: 'head' },
  { key: 'Face',      label: 'Face',      gridArea: 'face' },
  { key: 'Ear2',      label: 'Ear',       gridArea: 'ear2' },
  { key: 'Neck',      label: 'Neck',      gridArea: 'neck' },
  { key: 'Shoulders', label: 'Shoulders', gridArea: 'shoulders' },
  { key: 'Arms',      label: 'Arms',      gridArea: 'arms' },
  { key: 'Back',      label: 'Back',      gridArea: 'back' },
  { key: 'Wrist1',    label: 'Wrist',     gridArea: 'wrist1' },
  { key: 'Chest',     label: 'Chest',     gridArea: 'chest' },
  { key: 'Wrist2',    label: 'Wrist',     gridArea: 'wrist2' },
  { key: 'Range',     label: 'Range',     gridArea: 'range' },
  { key: 'Hands',     label: 'Hands',     gridArea: 'hands' },
  { key: 'Primary',   label: 'Primary',   gridArea: 'primary' },
  { key: 'Secondary', label: 'Secondary', gridArea: 'secondary' },
  { key: 'Finger1',   label: 'Finger',    gridArea: 'finger1' },
  { key: 'Legs',      label: 'Legs',      gridArea: 'legs' },
  { key: 'Finger2',   label: 'Finger',    gridArea: 'finger2' },
  { key: 'Feet',      label: 'Feet',      gridArea: 'feet' },
  { key: 'Waist',     label: 'Waist',     gridArea: 'waist' },
  { key: 'Ammo',      label: 'Ammo',      gridArea: 'ammo' },
];

export const INVENTORY_BAG_SLOTS: SlotDef[] = [
  { key: 'General1',  label: '1', gridArea: '' },
  { key: 'General2',  label: '2', gridArea: '' },
  { key: 'General3',  label: '3', gridArea: '' },
  { key: 'General4',  label: '4', gridArea: '' },
  { key: 'General5',  label: '5', gridArea: '' },
  { key: 'General6',  label: '6', gridArea: '' },
  { key: 'General7',  label: '7', gridArea: '' },
  { key: 'General8',  label: '8', gridArea: '' },
];

export const BANK_BAG_SLOTS: SlotDef[] = [
  { key: 'Bank1',  label: '1', gridArea: '' },
  { key: 'Bank2',  label: '2', gridArea: '' },
  { key: 'Bank3',  label: '3', gridArea: '' },
  { key: 'Bank4',  label: '4', gridArea: '' },
  { key: 'Bank5',  label: '5', gridArea: '' },
  { key: 'Bank6',  label: '6', gridArea: '' },
  { key: 'Bank7',  label: '7', gridArea: '' },
  { key: 'Bank8',  label: '8', gridArea: '' },
];

/** All top-level slot definitions (for backward compat) */
export const EQUIPMENT_SLOTS: SlotDef[] = [
  ...WORN_SLOTS,
  ...INVENTORY_BAG_SLOTS,
  ...BANK_BAG_SLOTS,
];
