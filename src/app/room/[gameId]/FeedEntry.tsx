import type { FeedEntry as FeedEntryType } from './feed';
import { formatDisplayName } from './displayName';
import { formatActionEntry, isSeparator } from './formatFeed';

const FeedEntry = ({ entry, myUser }: { entry: FeedEntryType, myUser: string | undefined }) => {
  if (entry.kind === 'chat') {
    const isMine = myUser !== undefined && entry.user === myUser;
    return (
      <div className="px-3 py-0.5 break-words">
        <span className={isMine ? 'text-emerald-400' : 'text-sky-400'}>
          {formatDisplayName(entry.user)}
        </span>
        <span className="text-gray-400">: </span>
        <span className="text-gray-100">{entry.text}</span>
      </div>
    );
  }

  if (entry.kind === 'system') {
    return (
      <div className="px-3 py-0.5 text-amber-400 italic break-words">
        {entry.text}
      </div>
    );
  }

  const content = formatActionEntry(entry.entry, myUser);
  if (content === null) return null;

  if (isSeparator(entry.entry)) {
    return (
      <div className="px-3 py-1 mt-1 flex items-center gap-2 text-gray-400">
        <span className="h-px flex-1 bg-gray-700" />
        <span className="whitespace-nowrap">{content}</span>
        <span className="h-px flex-1 bg-gray-700" />
      </div>
    );
  }

  return <div className="px-3 py-0.5 text-gray-300 break-words">{content}</div>;
};

export default FeedEntry;
