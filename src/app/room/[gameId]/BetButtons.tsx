import { useState } from 'react';

const BetButtons = ({fold, check, call, bet, pot, collectedPot, currentBet, minRaise, chips, chipsInPot }: { fold: () => void, check: () => void, call: () => void, bet: (chips: number) => void, pot: number, collectedPot: number, currentBet: number, minRaise: number, chips: number, chipsInPot: number }) => {
  const minBet = Math.min(minRaise + currentBet, chips + chipsInPot);
  const maxBet = chips + chipsInPot;
  const [betAmount, setBetAmount] = useState<number>(minBet);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBetAmount(Number(e.target.value));
  };

  const handleButtonClick = (multiplier: number) => {
    if (currentBet === 0) {
      setBetAmount(currentBet * multiplier);
    } else {
      setBetAmount((currentBet * 3 + pot - collectedPot - currentBet - chipsInPot) * multiplier);
    }
  };

  const handleAllIn = () => {
    setBetAmount(chips + chipsInPot); // Set to max for ALL-IN
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value < minBet) {
      setBetAmount(minBet);
    } else if (value > maxBet) {
      setBetAmount(maxBet);
    } else {
      setBetAmount(value);
    }
  };

  return (
    <div 
      className="absolute w-[35%] right-[2%] bottom-[2%] text-white rounded-lg "
    >
      <div className="flex justify-between w-full mb-[2%]">
        <button className="w-1/3 bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text" onClick={fold}>
          FOLD
        </button>
        {
          chipsInPot === currentBet ?
          <button className="w-1/3 bg-green-600 py-[1%] px-[2%] rounded-md hover:bg-green-500 dynamic-text" onClick={check}>
            CHECK <br /> 
          </button>
          :
          <button className="w-1/3 bg-green-600 py-[1%] px-[2%] rounded-md hover:bg-green-500 dynamic-text" onClick={call}>
            CALL <br /> <span className="font-bold dynamic-text">{currentBet - chipsInPot}</span>
          </button>
        }
        <button className="w-1/3 bg-blue-600 py-[1%] px-[2%] rounded-md hover:bg-blue-500 dynamic-text" onClick={() => bet(betAmount)}>
        {
          currentBet === 0 ?
          <>BET<br /> <span className="font-bold dynamic-text">{betAmount}</span></>
          :
          <>RAISE<br /> <span className="font-bold dynamic-text">{betAmount}</span></>
        }
        </button>
      </div>

      <div className="flex items-center w-full mb-[2%]">
        <div className="flex items-center flex-grow">
          <button 
            className="bg-gray-600 py-[3%] px-[3%] rounded-l-md hover:bg-gray-500 dynamic-text"
            onClick={() => setBetAmount(prev => Math.max(prev - 5, minBet))}
          >
            -
          </button>
          <input
            type="range"
            min={minBet}
            max={maxBet}
            value={betAmount}
            onChange={handleSliderChange}
            className="w-full mx-[2%]"
          />
          <button 
            className="bg-gray-600 py-[3%] px-[3%] rounded-r-md hover:bg-gray-500 dynamic-text"
            onClick={() => setBetAmount(prev => Math.min(prev + 5, maxBet))}
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
          onClick={() => handleButtonClick(1/2)}
        >
          1/2 Pot
        </button>
        <button 
          className="w-1/4 bg-gray-700 py-[2%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text"
          onClick={() => handleButtonClick(2/3)}
        >
          2/3 Pot
        </button>
        <button 
          className="w-1/4 bg-gray-700 py-[2%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text"
          onClick={() => handleButtonClick(1)}
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
