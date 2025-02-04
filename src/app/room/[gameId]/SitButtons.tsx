import React, { useState } from "react";

const SitButtons = ({ addChips, sitIn, sitOut, leave, sittingOut }: { addChips: (chips: number) => void, sitIn: () => void, sitOut: () => void, leave: () => void, sittingOut: boolean }) => {
  const [showModal, setShowModal] = useState(false);
  const [chipAmount, setChipAmount] = useState("");

  const handleAddChips = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setChipAmount("");
  };

  const handleConfirm = () => {
    addChips(parseInt(chipAmount));
    handleCloseModal();
  };

  return (
    <div className="absolute w-[12%] left-[2%] bottom-[2%] text-white rounded-lg">
      {/* Buttons */}
      <div className="flex justify-between w-full mb-[2%]">
        <button
          className="w-full bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text"
          onClick={handleAddChips}
        >
          ADD CHIPS
        </button>
      </div>
      <div className="flex justify-between w-full mb-[2%]">
        {
          sittingOut ?
          <button className="w-full bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-green-500 dynamic-text" onClick={sitIn}>
            SIT IN
          </button> :
          <button className="w-full bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-green-500 dynamic-text" onClick={sitOut}>
            SIT OUT
          </button>
        }
      </div>
      <div className="flex justify-between w-full mb-[2%]">
        <button className="w-full bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-blue-500 dynamic-text" onClick={leave}>
          LEAVE
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white w-[300px]">
            <h2 className="text-lg font-semibold mb-4">Enter Chip Amount</h2>
            <input
              type="number"
              value={chipAmount}
              onChange={(e) => setChipAmount(e.target.value)}
              className="w-full p-2 mb-4 text-black rounded-md border border-gray-400"
              placeholder="Enter amount"
            />
            <div className="flex justify-between">
              <button
                onClick={handleCloseModal}
                className="bg-gray-600 px-4 py-2 rounded-md hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="bg-green-500 px-4 py-2 rounded-md hover:bg-green-400"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SitButtons;
