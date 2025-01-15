import PlayerSeat from './PlayerSeat';

export default function Room() {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*9/16)] max-w-[calc(100vh*16/9)] aspect-[16/9] grid grid-rows-10 grid-cols-12">
      <div className="row-start-3 row-end-8 col-start-3 col-end-11 bg-green-800 rounded-[60%_60%_60%_60%]" />
      <PlayerSeat seatId="0" />
      <PlayerSeat seatId="1" />
      <PlayerSeat seatId="2" />
      <PlayerSeat seatId="3" />
      <PlayerSeat seatId="4" />
      <PlayerSeat seatId="5" />
      <PlayerSeat seatId="6" />
      <PlayerSeat seatId="7" />
      <PlayerSeat seatId="8" />
    </div>
  );
}
