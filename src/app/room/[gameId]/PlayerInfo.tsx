// Fix 5: strip Auth0 provider prefix and truncate the opaque ID
const formatDisplayName = (sub: string) => {
  const sep = sub.indexOf('|');
  const id = sep >= 0 ? sub.slice(sep + 1) : sub;
  return id.slice(0, 10);
};

const PlayerInfo = ({ position, name, chips, spotlight }: { position: string, name: string, chips: number, spotlight: boolean }) => {
  const ping = spotlight ? 'animate-pulse' : '';
  return (
    <div className={`${position} absolute transform -translate-x-1/2 -translate-y-1/2 w-[15%] h-[5%] bg-gray-800 rounded-lg text-center dynamic-text ${ping}`}>
      {formatDisplayName(name)}
      <br /> {chips}
    </div>
  );
}

export default PlayerInfo;
