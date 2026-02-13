import { Entity, PrimaryColumn } from 'typeorm';

@Entity('raid_call_attendance', { schema: 'public' })
export class RaidCallAttendance {
  @PrimaryColumn('integer', { name: 'call_id' })
  callId: number;

  @PrimaryColumn('bigint', { name: 'attendance_id' })
  attendanceId: string;
}
