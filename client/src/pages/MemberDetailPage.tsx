import { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useMemberQuery } from '../hooks/useMemberQuery';
import { useBioMutation } from '../hooks/useBioMutation';
import { useRoleMutation } from '../hooks/useRoleMutation';
import { useCharacterMutations } from '../hooks/useCharacterMutations';
import CharacterCard from '../components/roster/CharacterCard';
import CharacterEditModal from '../components/roster/CharacterEditModal';
import EquipmentPanel from '../components/roster/EquipmentPanel';
import ItemIcon from '../components/bank/ItemIcon';
import ItemTooltip from '../components/bank/ItemTooltip';
import MemberName from '../components/MemberName';
import { useEquipmentSearch } from '../hooks/useEquipmentSearch';
import { useEquipmentVisibility } from '../hooks/useEquipmentVisibility';
import { Text, Card, Button, Input, Textarea } from '../ui';
import { text } from '../ui/recipes';
import { cx } from 'class-variance-authority';
import { getMostRecentClass } from '../lib/classColors';
import { outranks } from '../lib/roles';

function formatDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MemberDetailPage() {
  const { discordId } = useParams<{ discordId: string }>();
  const { user: authUser, isDemo } = useAuth();
  const navigate = useNavigate();
  const { onlineIds } = useSocket();
  const { data, isLoading, error } = useMemberQuery(discordId);
  const bioMutation = useBioMutation(discordId);
  const roleMutation = useRoleMutation(discordId);
  const { save: saveMutation, drop: dropMutation } = useCharacterMutations(discordId);

  // Bio editing
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');

  // Character editing
  const [editingCharacter, setEditingCharacter] = useState<{ name: string; class: string; level: number; status: string } | 'new' | null>(null);
  const [charError, setCharError] = useState<string | null>(null);

  // Equipment
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);
  const [equipSearch, setEquipSearch] = useState('');
  const { data: equipResults } = useEquipmentSearch(discordId, equipSearch);
  const visibilityMutation = useEquipmentVisibility(discordId);

  const isOwnProfile = authUser?.id === discordId;
  const equipmentVisible = isOwnProfile || data?.equipmentPublic;
  const canToggleOfficer = (authUser?.isOwner || authUser?.isAdmin) && !isOwnProfile && !data?.isOwner;
  const canToggleAdmin = authUser?.isOwner && !isOwnProfile && !data?.isOwner;
  const canManageCharacters = isOwnProfile ||
    (authUser?.role && data?.role && outranks(authUser.role, data.role));

  const startEditBio = useCallback(() => {
    setBioText(data?.bio || '');
    setEditingBio(true);
  }, [data?.bio]);

  const saveBio = useCallback(() => {
    bioMutation.mutate(bioText, {
      onSuccess: () => setEditingBio(false),
    });
  }, [bioMutation, bioText]);

  const netDkp = data ? data.earnedDkp - data.spentDkp : 0;
  const maxDkp = useMemo(() => {
    if (!data?.dkpByCharacter.length) return 1;
    return Math.max(...data.dkpByCharacter.map(c => c.totalDkp), 1);
  }, [data]);
  const dkpMap = useMemo(() => {
    const m = new Map<string, { totalDkp: number; raidCount: number }>();
    data?.dkpByCharacter.forEach(c => m.set(c.name, { totalDkp: c.totalDkp, raidCount: c.raidCount }));
    return m;
  }, [data]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-content mx-auto py-3 px-3 pb-8 w-full flex flex-col gap-2 max-md:px-1.5 max-md:py-1.5 max-md:pb-14">
          <Link to="/roster" className="no-underline">
            <Text variant="caption" className="hover:text-accent transition-colors duration-fast">&lsaquo; Back to roster</Text>
          </Link>

          {error && <Text variant="error">{error instanceof Error ? error.message : 'Failed to fetch member'}</Text>}
          {isLoading && <Text variant="caption" className="py-6 text-center block">Loading...</Text>}

          {!isLoading && data && (
            <>
              {/* Profile header */}
              <div className="flex flex-col gap-0.5 py-1">
                <MemberName
                  name={data.displayName}
                  classColor={getMostRecentClass(data.characters)}
                  role={data.role}
                  hasGuildSpace={data.hasGuildSpace}
                  isOnline={onlineIds.includes(discordId!)}
                  iconSize="md"
                  officerSince={data.officerSince}
                  adminSince={data.adminSince}
                  className="font-display text-display font-semibold truncate inline-flex items-center gap-1"
                />
                <div className="flex items-center gap-3">
                  <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow text-subheading')}>{netDkp} DKP</span>
                  {data.joinedAt && <Text variant="caption">Joined {formatDate(data.joinedAt)}</Text>}
                  {authUser && !isOwnProfile && !isDemo && (
                    <Button size="sm" intent="primary" onClick={() => navigate(`/dm/${discordId}`)}>
                      Message
                    </Button>
                  )}
                </div>
              </div>

              {/* Role management */}
              {(canToggleOfficer || canToggleAdmin) && (
                <div className="flex gap-1.5">
                  {canToggleOfficer && (
                    data.isOfficer ? (
                      <Button
                        size="sm"
                        intent="danger"
                        disabled={roleMutation.isPending}
                        onClick={() => roleMutation.mutate({ isOfficer: false })}
                      >
                        {roleMutation.isPending ? 'Updating...' : 'Remove Officer'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        intent="primary"
                        disabled={roleMutation.isPending}
                        onClick={() => roleMutation.mutate({ isOfficer: true })}
                      >
                        {roleMutation.isPending ? 'Updating...' : 'Make Officer'}
                      </Button>
                    )
                  )}
                  {canToggleAdmin && (
                    data.isAdmin ? (
                      <Button
                        size="sm"
                        intent="danger"
                        disabled={roleMutation.isPending}
                        onClick={() => roleMutation.mutate({ isAdmin: false })}
                      >
                        {roleMutation.isPending ? 'Updating...' : 'Remove Admin'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        intent="ghost"
                        disabled={roleMutation.isPending}
                        onClick={() => roleMutation.mutate({ isAdmin: true })}
                      >
                        {roleMutation.isPending ? 'Updating...' : 'Make Admin'}
                      </Button>
                    )
                  )}
                </div>
              )}

              {/* Bio */}
              {editingBio ? (
                <Card className="p-2 flex flex-col gap-1">
                  <Textarea
                    variant="surface"
                    size="sm"
                    rows={3}
                    maxLength={300}
                    placeholder="Write something about yourself..."
                    value={bioText}
                    onChange={e => setBioText(e.target.value)}
                    className="w-full resize-none"
                  />
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={saveBio} disabled={bioMutation.isPending}>
                      {bioMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="sm" intent="ghost" onClick={() => setEditingBio(false)}>Cancel</Button>
                    <Text variant="caption" className="ml-auto">{bioText.length}/300</Text>
                  </div>
                </Card>
              ) : data.bio ? (
                <Card className="p-2">
                  <Text variant="secondary" className="whitespace-pre-wrap">{data.bio}</Text>
                  {isOwnProfile && (
                    <button
                      className="bg-transparent border-none cursor-pointer mt-0.5 block"
                      onClick={startEditBio}
                    >
                      <Text variant="caption" className="hover:text-accent transition-colors duration-fast">Edit bio</Text>
                    </button>
                  )}
                </Card>
              ) : isOwnProfile ? (
                <button
                  className="bg-transparent border border-border-subtle border-dashed rounded-md py-1.5 px-2 cursor-pointer text-left hover:border-accent transition-colors duration-fast"
                  onClick={startEditBio}
                >
                  <Text variant="caption" className="text-text-dim">Add a bio...</Text>
                </button>
              ) : null}

              {/* DKP Summary */}
              <Card className="p-2 flex gap-4 max-md:flex-col max-md:gap-2">
                <div className="flex flex-col">
                  <Text variant="overline">Earned</Text>
                  <span className={cx(text({ variant: 'mono' }), 'font-bold text-green text-subheading')}>{data.earnedDkp}</span>
                </div>
                <div className="flex flex-col">
                  <Text variant="overline">Spent</Text>
                  <span className={cx(text({ variant: 'mono' }), 'font-bold text-red text-subheading')}>{data.spentDkp}</span>
                </div>
                <div className="flex flex-col">
                  <Text variant="overline">Net</Text>
                  <span className={cx(text({ variant: 'mono' }), 'font-bold text-yellow text-subheading')}>{netDkp}</span>
                </div>
              </Card>

              {/* Characters */}
              <div className="flex items-center justify-between mt-1">
                <Text variant="overline">Characters</Text>
                {canManageCharacters && (
                  <Button
                    size="xs"
                    intent="ghost"
                    onClick={() => { setCharError(null); setEditingCharacter('new'); }}
                  >
                    + Add
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {[...data.characters].sort((a, b) => {
                  const aDate = a.lastRaidDate ? new Date(a.lastRaidDate).getTime() : 0;
                  const bDate = b.lastRaidDate ? new Date(b.lastRaidDate).getTime() : 0;
                  if (bDate !== aDate) return bDate - aDate;
                  if (b.level !== a.level) return b.level - a.level;
                  const STATUS_ORDER: Record<string, number> = { Main: 0, Alt: 1, Bot: 2 };
                  const aStatus = STATUS_ORDER[a.status] ?? 3;
                  const bStatus = STATUS_ORDER[b.status] ?? 3;
                  if (aStatus !== bStatus) return aStatus - bStatus;
                  return a.name.localeCompare(b.name);
                }).map(c => (
                  <div key={c.name} className="flex flex-col gap-1.5">
                    <CharacterCard
                      name={c.name}
                      class={c.class}
                      level={c.level}
                      status={c.status}
                      lastRaidDate={c.lastRaidDate}
                      onEdit={canManageCharacters ? () => { setCharError(null); setEditingCharacter(c); } : undefined}
                      totalDkp={dkpMap.get(c.name)?.totalDkp}
                      raidCount={dkpMap.get(c.name)?.raidCount}
                      maxDkp={maxDkp}
                      equipmentPreview={equipmentVisible ? c.equipmentPreview : null}
                      equipmentExpanded={expandedEquipment === c.name}
                      onToggleEquipment={equipmentVisible ? () => setExpandedEquipment(prev => prev === c.name ? null : c.name) : undefined}
                    />
                    {expandedEquipment === c.name && (
                      <EquipmentPanel
                        discordId={discordId!}
                        characterName={c.name}
                        isOwner={isOwnProfile}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Equipment visibility toggle + search */}
              {isOwnProfile && (
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    size="sm"
                    intent={data.equipmentPublic ? 'success' : 'ghost'}
                    pending={visibilityMutation.isPending}
                    onClick={() => visibilityMutation.mutate(!data.equipmentPublic)}
                  >
                    {data.equipmentPublic ? 'Equipment: Visible to Guild' : 'Equipment: Hidden'}
                  </Button>
                  <Text variant="caption">
                    {data.equipmentPublic ? 'Others can see your gear' : 'Only you can see your gear'}
                  </Text>
                </div>
              )}

              {equipmentVisible && (
                <Card className="mt-1">
                  <div className="flex items-center gap-2 py-1 px-2 border-b border-border">
                    <span className={text({ variant: 'overline' })}>EQUIPMENT SEARCH</span>
                    {equipSearch.length >= 2 && equipResults && (
                      <Text variant="caption" className="ml-auto">{equipResults.length} result{equipResults.length !== 1 ? 's' : ''}</Text>
                    )}
                  </div>
                  <div className="py-1 px-2 border-b border-border">
                    <Input
                      variant="transparent"
                      size="sm"
                      type="text"
                      placeholder="Search equipped items across all characters..."
                      value={equipSearch}
                      onChange={e => setEquipSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  {equipSearch.length >= 2 && equipResults && equipResults.length > 0 && (
                    <div>
                      {equipResults.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 py-1 px-2 border-b border-border-subtle last:border-b-0 hover:bg-surface-2 transition-colors duration-fast">
                          <ItemIcon iconId={r.iconId} />
                          <ItemTooltip name={r.itemName} iconId={r.iconId} statsblock={r.statsblock}>
                            <span className="text-text font-body text-caption font-semibold">{r.itemName}</span>
                          </ItemTooltip>
                          <Text variant="caption" className="ml-auto shrink-0">{r.characterName} &middot; {r.slot}</Text>
                        </div>
                      ))}
                    </div>
                  )}
                  {equipSearch.length >= 2 && equipResults && equipResults.length === 0 && (
                    <Text variant="caption" className="text-center py-3 block">No items match</Text>
                  )}
                </Card>
              )}

              <CharacterEditModal
                isOpen={editingCharacter !== null}
                onClose={() => setEditingCharacter(null)}
                character={editingCharacter === 'new' ? null : editingCharacter}
                isPending={saveMutation.isPending || dropMutation.isPending}
                error={charError}
                onSave={(charData) => {
                  setCharError(null);
                  saveMutation.mutate(charData, {
                    onSuccess: () => setEditingCharacter(null),
                    onError: (err) => setCharError(err instanceof Error ? err.message : 'Failed to save'),
                  });
                }}
                onDrop={(name) => {
                  setCharError(null);
                  dropMutation.mutate(name, {
                    onSuccess: () => setEditingCharacter(null),
                    onError: (err) => setCharError(err instanceof Error ? err.message : 'Failed to drop'),
                  });
                }}
              />

            </>
          )}
        </div>
      </div>
  );
}
