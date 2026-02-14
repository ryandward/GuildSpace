import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('classes')
export class Classes {
  @PrimaryColumn('text', { name: 'character_class' })
  characterClass: string;

  @Column('text', { name: 'abbreviation' })
  abbreviation: string;
}
