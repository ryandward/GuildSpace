import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bank_import', { schema: 'public' })
export class BankImport {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('text', { name: 'banker' })
  banker: string;

  @Column('text', { name: 'uploaded_by' })
  uploadedBy: string;

  @Column('text', { name: 'uploaded_by_name' })
  uploadedByName: string;

  @Column('int', { name: 'item_count' })
  itemCount: number;

  @Column('jsonb', { name: 'diff' })
  diff: {
    added: { name: string; quantity: number }[];
    removed: { name: string; quantity: number }[];
    changed: { name: string; oldQuantity: number; newQuantity: number }[];
  };

  @Column('timestamp', { name: 'created_at', default: () => 'NOW()' })
  createdAt: Date;
}
