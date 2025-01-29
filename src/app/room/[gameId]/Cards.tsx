import Card from './Card';

const Cards = ({ size, position, cards }: {size: string, position: string, cards: string[] | null}) => {
  if (!cards) {
    return null;
  }
  
  return (
    <div className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${size} ${position} flex `}>
      {cards.map((card, index) => <Card key={index} rank={card[0]} suit={card[1]} />)}
    </div>
  );
}

export default Cards;
