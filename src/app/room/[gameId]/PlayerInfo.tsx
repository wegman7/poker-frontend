const PlayerInfo = ({ position, name, chips, spotlight }: { position: string, name: string, chips: number, spotlight: boolean }) => {
  let ping = '';
  if (spotlight) {
    ping = 'animate-pulse';
  }
  return (
    <div className={`${position} absolute transform -translate-x-1/2 -translate-y-1/2 w-[15%] h-[5%] bg-gray-800 rounded-lg text-center dynamic-text ${ping}`}>
      {name}
      <br /> {chips}
    </div>
  );
}

export default PlayerInfo;
