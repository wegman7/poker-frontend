const PlayerSeat = ({ name, stack, position }) => {
  const positions = {
    top: 'top-5 left-[50%] transform -translate-x-1/2',
    'top-right': 'top-10 right-5',
    right: 'top-[50%] right-5 transform -translate-y-1/2',
    'bottom-right': 'bottom-10 right-5',
    bottom: 'bottom-5 left-[50%] transform -translate-x-1/2',
    'bottom-left': 'bottom-10 left-5',
    left: 'top-[50%] left-5 transform -translate-y-1/2',
    'top-left': 'top-10 left-5',
  };

  return (
    <div className={`absolute ${positions[position]} flex flex-col items-center`}>
      <div className="w-12 h-12 bg-gray-400 rounded-full border-2 border-black"></div>
      <div className="text-white text-sm mt-2">{name}</div>
      <div className="text-yellow-400 text-xs">${stack}</div>
    </div>
  );
};

export default PlayerSeat;
