const PlayerSeat = ({ seatId }: {seatId: string}) => {

  const positions = new Map<string, string>([
    ['0', 'row-start-3 col-start-7 col-end-9'],
    ['1', 'row-start-5 col-start-9'],
    ['2', 'row-start-7 col-start-11'],
    ['3', 'row-start-6 col-start-9'],
    ['4', 'row-start-10 col-start-7'],
    ['5', 'row-start-3 col-start-7'],
    ['6', 'row-start-3 col-start-7'],
    ['7', 'row-start-3 col-start-7'],
    ['8', 'row-start-3 col-start-5'],
  ]);

  return (
    <div className={`${positions.get(seatId)} bg-gray-800`}>{seatId}</div>
  )
};

export default PlayerSeat;
