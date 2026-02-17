import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('character_equipment')
export class CharacterEquipment {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('text', { name: 'character_name' })
  characterName: string;

  @Column('text', { name: 'discord_id' })
  discordId: string;

  @Column('text', { name: 'slot' })
  slot: string;

  @Column('text', { name: 'item_name', default: 'Empty' })
  itemName: string;

  @Column('text', { name: 'eq_item_id', default: '0' })
  eqItemId: string;

  @Column('timestamp', { name: 'updated_at', default: () => 'NOW()' })
  updatedAt: Date;
}
