import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEventCommentsQuery } from '../../hooks/useEventCommentsQuery';
import { usePostCommentMutation, useDeleteCommentMutation } from '../../hooks/useEventCommentMutations';
import { Button, Card, Text, Textarea } from '../../ui';
import { text } from '../../ui/recipes';
import { timeAgo } from '../../utils/timeAgo';

const MAX_LENGTH = 300;

interface Props {
  eventId: string | undefined;
}

/**
 * Comments on a raid event, open to any signed-in member.
 *
 * Most events will never have one, so the empty state is a single dashed
 * affordance rather than a card — the same shape MemberDetailPage uses for a
 * profile with no bio.
 */
export default function EventComments({ eventId }: Props) {
  const { user } = useAuth();
  const { data: comments, isLoading, error } = useEventCommentsQuery(eventId);
  const postComment = usePostCommentMutation(eventId);
  const deleteComment = useDeleteCommentMutation(eventId);

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [postError, setPostError] = useState<string | null>(null);

  // Render nothing until the query settles, so an event with no comments never
  // flashes a list and an event with them never flashes an empty state.
  if (isLoading) return null;

  if (error) {
    return (
      <Text variant="error">
        {error instanceof Error ? error.message : 'Failed to load comments'}
      </Text>
    );
  }

  const submit = () => {
    setPostError(null);
    postComment.mutate(draft, {
      onSuccess: () => {
        setDraft('');
        setComposing(false);
      },
      onError: (err) => setPostError(err instanceof Error ? err.message : 'Failed to post comment'),
    });
  };

  const cancel = () => {
    setDraft('');
    setComposing(false);
    setPostError(null);
  };

  const composer = (
    <div className="p-2 flex flex-col gap-1">
      <Textarea
        variant="surface"
        size="sm"
        rows={3}
        maxLength={MAX_LENGTH}
        autoFocus
        placeholder="I was on Gigabroms for calls 2-3..."
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="w-full resize-none"
      />
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={submit} disabled={!draft.trim() || postComment.isPending}>
          {postComment.isPending ? 'Posting...' : 'Post'}
        </Button>
        <Button size="sm" intent="ghost" onClick={cancel}>Cancel</Button>
        <Text variant="caption" className="ml-auto">{draft.length}/{MAX_LENGTH}</Text>
      </div>
      {postError && <Text variant="error">{postError}</Text>}
    </div>
  );

  // Nothing written yet: one dim line, not a card with a zero in it.
  if (!comments || comments.length === 0) {
    if (!user) return null;
    return composing ? (
      <Card>{composer}</Card>
    ) : (
      <button
        className="bg-transparent border border-border-subtle border-dashed rounded-md py-1.5 px-2 cursor-pointer text-left hover:border-accent transition-colors duration-fast"
        onClick={() => setComposing(true)}
      >
        <Text variant="caption" className="text-text-dim">Add a comment...</Text>
      </button>
    );
  }

  return (
    <Card>
      <div className="py-1 px-2 min-h-6">
        <span className={text({ variant: 'overline' })}>COMMENTS ({comments.length})</span>
      </div>

      <div className="border-t border-border flex flex-col">
        {comments.map(comment => {
          const canDelete = user?.id === comment.userId || user?.isOfficer;
          return (
            <div key={comment.id} className="px-2 py-1.5 border-b border-border-subtle last:border-b-0">
              <div className="flex items-baseline gap-1">
                <Link
                  to={`/roster/${comment.userId}`}
                  className={`${text({ variant: 'body' })} font-bold no-underline hover:brightness-125 transition-[color,filter] duration-fast`}
                >
                  {comment.displayName}
                </Link>
                <Text variant="caption" className="text-text-dim">{timeAgo(comment.createdAt)}</Text>
                {canDelete && (
                  <button
                    className="ml-auto bg-transparent border-none cursor-pointer p-0"
                    onClick={() => deleteComment.mutate(comment.id)}
                    aria-label="Delete comment"
                  >
                    <Text variant="caption" className="text-text-dim hover:text-red transition-colors duration-fast">
                      delete
                    </Text>
                  </button>
                )}
              </div>
              <Text variant="secondary" className="whitespace-pre-wrap break-words">{comment.content}</Text>
            </div>
          );
        })}
      </div>

      {user && (composing ? (
        <div className="border-t border-border">{composer}</div>
      ) : (
        <button
          className="w-full text-left bg-transparent border-none border-t border-border cursor-pointer px-2 py-1.5 hover:bg-surface-2 transition-colors duration-fast"
          onClick={() => setComposing(true)}
        >
          <Text variant="caption" className="text-text-dim">Add a comment...</Text>
        </button>
      ))}
    </Card>
  );
}
