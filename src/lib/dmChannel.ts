export function dmChannel(a: string, b: string): string {
  return a < b ? `dm:${a}:${b}` : `dm:${b}:${a}`;
}

export function isDmChannel(ch: string): boolean {
  return ch.startsWith('dm:');
}

export function dmParticipants(ch: string): [string, string] | null {
  const m = ch.match(/^dm:(.+):(.+)$/);
  return m ? [m[1], m[2]] : null;
}
