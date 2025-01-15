import PlayerSeat from './PlayerSeat';

const PokerTable = () => {
  console.log(Array.from({ length: parseInt('17') }, (_, i) => [i + 1, `${i + 1}`]))
  return (
    // <div className="relative w-[80%] h-[80%] bg-green-900 rounded-full shadow-lg">
    //   {/* Community Cards */}
    //   <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] flex gap-4">
    //     <div className="w-10 h-14 bg-white rounded-md shadow-md flex justify-center items-center text-lg font-bold">10♥</div>
    //     <div className="w-10 h-14 bg-white rounded-md shadow-md flex justify-center items-center text-lg font-bold">4♠</div>
    //     <div className="w-10 h-14 bg-white rounded-md shadow-md flex justify-center items-center text-lg font-bold">10♦</div>
    //     <div className="w-10 h-14 bg-white rounded-md shadow-md flex justify-center items-center text-lg font-bold">A♥</div>
    //     <div className="w-10 h-14 bg-white rounded-md shadow-md flex justify-center items-center text-lg font-bold">8♠</div>
    //   </div>
    //   {/* Player Seats */}
    //   <PlayerSeat name="Bomber_Gerd" stack="79.45" position="top" />
    //   <PlayerSeat name="pittura" stack="50" position="top-right" />
    //   <PlayerSeat name="1ByLgaR1" stack="77.95" position="right" />
    //   <PlayerSeat name="Vadik D" stack="20.35" position="bottom-right" />
    //   <PlayerSeat name="RYSWAL" stack="50" position="bottom" />
    //   <PlayerSeat name="circoflax" stack="50" position="bottom-left" />
    //   <PlayerSeat name="defraggle" stack="70.80" position="left" />
    //   <PlayerSeat name="zabiyakin" stack="7.05" position="top-left" />
    // </div>

    // you need absolute + top and left transfers to center it, max-h+max-w+aspect to keep the max size with correct aspect ratio
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*9/16)] max-w-[calc(100vh*16/9)] aspect-[16/9] grid grid-rows-10 grid-cols-12">
      <div className="row-start-3 row-end-8 col-start-3 col-end-11 bg-green-800 rounded-full"></div>
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
};

export default PokerTable;
