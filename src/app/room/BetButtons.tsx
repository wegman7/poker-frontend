import { useState } from 'react';

const BetButtons: React.FC = () => {
  const [betAmount, setBetAmount] = useState<number>(400);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBetAmount(Number(e.target.value));
  };

  const handleButtonClick = (multiplier: number) => {
    setBetAmount(prev => Math.min(prev * multiplier, 2000)); // Assuming max bet is 2000
  };

  const handleAllIn = () => {
    setBetAmount(2000); // Set to max for ALL-IN
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setBetAmount(value >= 200 ? Math.min(value, 2000) : 200);
  };

  return (
    <div className="absolute flex flex-col items-center p-4 bg-gray-800 rounded-lg w-full max-w-md text-white">
      <div className="flex justify-between w-full mb-4">
        <button className="w-1/3 bg-gray-700 py-2 px-4 rounded-md hover:bg-gray-600">FOLD</button>
        <button className="w-1/3 bg-green-600 py-2 px-4 rounded-md hover:bg-green-500">
          CALL <br /> <span className="text-lg font-bold">200</span>
        </button>
        <button className="w-1/3 bg-blue-600 py-2 px-4 rounded-md hover:bg-blue-500">
          RAISE TO <br /> <span className="text-lg font-bold">{betAmount}</span>
        </button>
      </div>

      <div className="flex items-center w-full mb-4">
        <div className="flex items-center flex-grow">
          <button 
            className="bg-gray-600 py-2 px-3 rounded-l-md hover:bg-gray-500"
            onClick={() => setBetAmount(prev => Math.max(prev - 100, 200))}
          >
            -
          </button>
          <input
            type="range"
            min="200"
            max="2000"
            value={betAmount}
            onChange={handleSliderChange}
            className="w-full mx-2"
          />
          <button 
            className="bg-gray-600 py-2 px-3 rounded-r-md hover:bg-gray-500"
            onClick={() => setBetAmount(prev => Math.min(prev + 100, 2000))}
          >
            +
          </button>
        </div>
        <input
          type="number"
          value={betAmount}
          onChange={handleInputChange}
          className="ml-4 w-24 text-center bg-gray-900 rounded-md py-2 border border-gray-700 text-lg font-bold"
        />
      </div>

      <div className="flex justify-between w-full">
        <button 
          className="w-1/4 bg-gray-700 py-2 px-4 rounded-md hover:bg-gray-600"
          onClick={() => handleButtonClick(3)}
        >
          X3
        </button>
        <button 
          className="w-1/4 bg-gray-700 py-2 px-4 rounded-md hover:bg-gray-600"
          onClick={() => handleButtonClick(5)}
        >
          X5
        </button>
        <button 
          className="w-1/4 bg-gray-700 py-2 px-4 rounded-md hover:bg-gray-600"
          onClick={() => setBetAmount(2000)}
        >
          Pot
        </button>
        <button 
          className="w-1/4 bg-red-600 py-2 px-4 rounded-md hover:bg-red-500"
          onClick={handleAllIn}
        >
          ALL-IN
        </button>
      </div>
    </div>
  );
};

export default BetButtons;
