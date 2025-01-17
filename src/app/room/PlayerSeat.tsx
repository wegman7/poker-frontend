// props:
  // "seatId": 1,
  // "user": "auth0|66820bf8b97e7d87b0a74e1c",
  // "sittingOut": false,
  // "chips": 400,
  // "chipsInPot": 0,
  // "timeBank": 0,
  // "holeCards": null,
  // "spotlight": false,
  // "dealer": false

import Card from "./Card";
import PokerChip from "./Chip";

const seatPositions: { [key: string]: string } = {
  '0': 'left-[65%] top-[10%]',
  '1': 'left-[80%] top-[15%]',
  '2': 'left-[93%] top-[30%]',
  '3': 'left-[93%] top-[65%]',
  '4': 'left-[50%] top-[91%]',
  '5': 'left-[7%] top-[65%]',
  '6': 'left-[7%] top-[30%]',
  '7': 'left-[20%] top-[15%]',
  '8': 'left-[35%] top-[10%]',
};

const cardSize: string = 'w-[7%] h-[12%]';
const cardOnePositions: { [key: string]: string } = {
  '0': 'left-[61.5%] top-[2%]',
  '1': 'left-[76.5%] top-[7%]',
  '2': 'left-[89.5%] top-[22%]',
  '3': 'left-[89.5%] top-[57%]',
  '4': 'left-[46.5%] top-[83%]',
  '5': 'left-[3.5%] top-[57%]',
  '6': 'left-[3.5%] top-[22%]',
  '7': 'left-[16.5%] top-[7%]',
  '8': 'left-[31.5%] top-[2%]',
};

const cardTwoPositions: { [key: string]: string } = {
  '0': 'left-[68.5%] top-[2%]',
  '1': 'left-[83.5%] top-[7%]',
  '2': 'left-[96.5%] top-[22%]',
  '3': 'left-[96.5%] top-[57%]',
  '4': 'left-[53.5%] top-[83%]',
  '5': 'left-[10.5%] top-[57%]',
  '6': 'left-[10.5%] top-[22%]',
  '7': 'left-[23.5%] top-[7%]',
  '8': 'left-[38.5%] top-[2%]',
};
  

  const PlayerSeat = ({ seatId }: { seatId: number }) => {
    if (!(seatId in seatPositions)) {
      console.error(`Invalid seatId: ${seatId}`);
      return null;
    }
  
    return (
      <>
        <Card rank="A" suit="s" size={cardSize} position={cardOnePositions[seatId]} />
        <Card rank="A" suit="s" size={cardSize} position={cardTwoPositions[seatId]} />
        <PokerChip amount={100} />
        <div className={`${seatPositions[seatId]} absolute transform -translate-x-1/2 -translate-y-1/2 w-[15%] h-[5%] bg-gray-800 rounded-lg text-center dynamic-text`}>
          {seatId}
        </div>
      </>
    );
  };
  
  export default PlayerSeat;
  