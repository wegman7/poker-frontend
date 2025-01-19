'use client'

import Cards from './Cards';
import Chips from './Chips';
import Seat from './Seat';
import BetButtons from './BetButtons';
import SitButtons from './SitButtons';

const cardsSizes: { [key: string]: string } = {
  '0': 'w-[14%] h-[12%]',
  '1': 'w-[18%] h-[12%]',
  '2': 'w-[24%] h-[12%]',
  '3': 'w-[30%] h-[12%]',
}
const cardsPositions: string = 'left-[50%] top-[35%]';

const chipAreaSize: string = 'w-[16%] h-[5%]';
const chipAreaPositions: string = 'left-[50%] top-[50%]';

export default function Room() {
  // const handleSliderChange = (value: number) => {
  //   console.log("Slider value:", value);
  // };

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-green-800 rounded-[50%_50%_50%_50%]" />
      <Cards size={cardsSizes[2]} position={cardsPositions} cards={['As', 'Kd', 'Qc', 'Jh']} />
      <Chips size={chipAreaSize} position={chipAreaPositions} amount={67.25} />
      {[...Array(9)].map((_, index) => (
        <Seat key={index} seatId={index} />
      ))}
      <SitButtons />
      <BetButtons />
    </div>
  );
}
