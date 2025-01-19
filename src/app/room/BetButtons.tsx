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
    <div 
      className="absolute w-[35%] left-[80%] top-[79%] transform -translate-x-1/2 text-white rounded-lg "
    >
      <div className="flex justify-between w-full mb-[2%]">
        <button className="w-1/3 bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text">FOLD</button>
        <button className="w-1/3 bg-green-600 py-[1%] px-[2%] rounded-md hover:bg-green-500 dynamic-text">
          CALL <br /> <span className="font-bold dynamic-text">200</span>
        </button>
        <button className="w-1/3 bg-blue-600 py-[1%] px-[2%] rounded-md hover:bg-blue-500 dynamic-text">
          RAISE TO <br /> <span className="font-bold dynamic-text">{betAmount}</span>
        </button>
      </div>

      <div className="flex items-center w-full mb-[2%]">
        <div className="flex items-center flex-grow">
          <button 
            className="bg-gray-600 py-[3%] px-[3%] rounded-l-md hover:bg-gray-500 dynamic-text"
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
            className="w-full mx-[2%]"
          />
          <button 
            className="bg-gray-600 py-[3%] px-[3%] rounded-r-md hover:bg-gray-500 dynamic-text"
            onClick={() => setBetAmount(prev => Math.min(prev + 100, 2000))}
          >
            +
          </button>
        </div>
        <input
          type="number"
          value={betAmount}
          onChange={handleInputChange}
          className="ml-[2%] w-[15%] text-center bg-gray-900 rounded-md py-[3%] border border-gray-700 font-bold dynamic-text"
        />
      </div>

      <div className="flex justify-between w-full">
        <button 
          className="w-1/4 bg-gray-700 py-[2%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text"
          onClick={() => handleButtonClick(3)}
        >
          X3
        </button>
        <button 
          className="w-1/4 bg-gray-700 py-[2%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text"
          onClick={() => handleButtonClick(5)}
        >
          X5
        </button>
        <button 
          className="w-1/4 bg-gray-700 py-[2%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text"
          onClick={() => setBetAmount(2000)}
        >
          Pot
        </button>
        <button 
          className="w-1/4 bg-red-600 py-[2%] px-[2%] rounded-md hover:bg-red-500 dynamic-text"
          onClick={handleAllIn}
        >
          ALL-IN
        </button>
      </div>
    </div>
  );
};

export default BetButtons;
