import Card from './Card';

const Cards = ({ position, cards }: {position: string, cards: string[] | null}) => {
  if (!cards) {
    return null;
  }

  const width = `w-[${cards.length * 6}%]`;
  const height = `h-[12%]`;

  // MAKE THE SIZE CHANGE DEPENDING ON THE NUMBER OF CARDS
  
  return (
    <div className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${position} ${width} ${height} flex `}>
      {cards.map((card, index) => <Card key={index} rank={card[0]} suit={card[1]} />)}
    </div>
  );
}

export default Cards;
