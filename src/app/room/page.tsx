import PlayerSeat from './PlayerSeat';

export default function Room() {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-green-800 rounded-[50%_50%_50%_50%]" />
      {[...Array(9)].map((_, index) => (
        <PlayerSeat key={index} seatId={index} />
      ))}
    </div>
  );
}
