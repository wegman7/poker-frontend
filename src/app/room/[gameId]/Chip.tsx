import React from "react";

const Chip = ({ amount, color, x, y }: { amount: number, color: string, x: string, y: string }) => {
  const formatted = amount.toString().replace(/^0(?=\.)/, '');
  return (
    <div className={`absolute chip-container`} style={{left: x, top: y}} >
      <div className="poker-chip" style={{ borderColor: color }}>
        <div className="chip-ring" style={{ borderColor: color }} />
        <div className="chip-amount">{formatted}</div>
      </div>
    </div>
  );
};

export default Chip;
