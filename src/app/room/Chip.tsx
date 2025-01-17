import React from "react";

const PokerChip = ({ amount, color }: { amount: number, color: string }) => {
  return (
    <div className="chip-container">
      <div className="poker-chip" style={{ borderColor: color }}>
        <div className="chip-ring" style={{ borderColor: color }} />
        <div className="chip-amount">{amount}</div>
      </div>
    </div>
  );
};

export default PokerChip;
