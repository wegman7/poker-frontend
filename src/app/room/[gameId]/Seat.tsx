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

import Cards from "./Cards";
import Chips from "./Chips";
import { Player } from "./page";
import PlayerInfo from "./PlayerInfo";

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

const cardsPositions: { [key: string]: string } = {
  '0': 'left-[65%] top-[2%]',
  '1': 'left-[80%] top-[7%]',
  '2': 'left-[93%] top-[22%]',
  '3': 'left-[93%] top-[57%]',
  '4': 'left-[50%] top-[83%]',
  '5': 'left-[7%] top-[57%]',
  '6': 'left-[7%] top-[22%]',
  '7': 'left-[20%] top-[7%]',
  '8': 'left-[35%] top-[2%]',
};

const chipAreaSize: string = 'w-[16%] h-[5%]';
const chipAreaPositions: { [key: string]: string } = {
  '0': 'left-[60%] top-[20%]',
  '1': 'left-[77%] top-[25%]',
  '2': 'left-[84%] top-[37%]',
  '3': 'left-[71%] top-[62%]',
  '4': 'left-[50%] top-[70%]',
  '5': 'left-[29%] top-[62%]',
  '6': 'left-[16%] top-[37%]',
  '7': 'left-[23%] top-[25%]',
  '8': 'left-[40%] top-[20%]',
};

const Seat = ({ seatId, player }: { seatId: number, player: Player | null }) => {
  if (!(seatId in seatPositions)) {
    console.error(`Invalid seatId: ${seatId}`);
    return null;
  }

  if (!player) {
    return null;
  }

  return (
    <>
      <Cards position={cardsPositions[seatId]} cards={player.holeCards} />
      <Chips size={chipAreaSize} position={chipAreaPositions[seatId]} amount={player.chipsInPot} dealer={player.dealer} />
      <PlayerInfo position={seatPositions[seatId]} name={player.user} chips={player.chips} spotlight={player.spotlight} />
    </>
  );
};

export default Seat;
