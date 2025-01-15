import PlayerSeat from './PlayerSeat';

const PokerTable = () => {
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
    <div className="">
      <div className="grid grid-rows-12 grid-cols-12 gap-4 max-h-[calc(100vw*9/16)] max-w-[calc(100vh*16/9)] aspect-[16/9] bg-green-900 rounded-full place-content-center">
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
    </div>
  );
};

export default PokerTable;
