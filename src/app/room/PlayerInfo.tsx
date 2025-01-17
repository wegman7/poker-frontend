const PlayerInfo = ({ position }: { position: string }) => {
  return (
    <div className={`${position} absolute transform -translate-x-1/2 -translate-y-1/2 w-[15%] h-[5%] bg-gray-800 rounded-lg text-center dynamic-text`}>
      player name
    </div>
  );
}

export default PlayerInfo;
