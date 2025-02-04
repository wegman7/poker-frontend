import React from "react";

const Chip = ({ x, y }: { x: string, y: string }) => {
  return (
    <div className={`absolute chip-container`} style={{left: x, top: y}} >
      <div className="poker-chip" style={{ borderColor: 'white' }}>
        <div className="chip-ring" style={{ borderColor: 'white' }} />
        <div className="chip-amount">DEALER</div>
      </div>
    </div>
  );
};

export default Chip;
