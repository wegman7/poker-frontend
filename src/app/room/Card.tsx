const Card = ({ rank, suit }: { rank: string, suit: string }) => {
  const suits = new Map<string, string>([
    ['h', '♥'],
    ['d', '♦'],
    ['c', '♣'],
    ['s', '♠'],
  ]);

  return (
    <div className="relative h-[100%] flex-1 bg-gray-300 rounded-lg text-gray-800 font-bold card-border">
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
