import React from "react";

const PokerChip = ({ amount }: { amount: number }) => {
  return (
    <div className="chip-container">
      <div className="poker-chip">
        <div className="chip-ring"></div>
        <div className="chip-amount">{amount}</div>
      </div>
    </div>
  );
};

export default PokerChip;
