const Card = ({ rank, suit }: { rank: string, suit: string }) => {
  const suits: { [key: string]: string } = {
    h: '♥',
    d: '♦',
    c: '♣',
    s: '♠',
  };
  
  const fontColor: { [key: string]: string } = {
    h: 'red',
    d: 'blue',
    c: 'green',
    s: 'black',
  };

  return (
    <div className="relative h-[100%] flex-1 bg-gray-300 rounded-lg font-bold card-border" style={{ color: fontColor[suit] }}>
      <div className="absolute left-[3%] -top-[14%] dynamic-text-lg">
        {rank}
      </div>
      <div className="absolute left-[23%] top-[24%] dynamic-text-xl">
        {suits[suit]}
      </div>
    </div>
  );
};

export default Card;
