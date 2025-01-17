const Card = ({ rank, suit, size, position }: { rank: string, suit: string, size: string, position: string }) => {
  const suits = new Map<string, string>([
    ['h', '♥'],
    ['d', '♦'],
    ['c', '♣'],
    ['s', '♠'],
  ]);

  console.log('Card', rank, suit, size, position);

  return (
    <div className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${size} ${position} bg-gray-300 rounded-lg text-gray-800 font-bold card-border`}>
      <div className="absolute left-[3%] -top-[14%] dynamic-text-lg">
        {rank}
      </div>
      <div className="absolute left-[27%] top-[12%] dynamic-text-xl">
        {suits.get(suit)}
      </div>
    </div>
  );
};

export default Card;
