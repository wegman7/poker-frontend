import Card from './Card';

const dynamicWidth: { [key: number]: string } = {
  2: 'w-[12%]',
  3: 'w-[18%]',
  4: 'w-[24%]',
  5: 'w-[30%]',
};

const height = `h-[12%]`;

const Cards = ({ position, cards }: {position: string, cards: string[] | null}) => {
  if (!cards) {
    return null;
  }

  const width = dynamicWidth[cards.length];
  
  return (
    <div className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${position} ${width} ${height} flex`}>
      {cards.map((card, index) => <Card key={index} rank={card[0]} suit={card[1]} />)}
    </div>
  );
}

export default Cards;
