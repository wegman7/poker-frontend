const SitButtons: React.FC = () => {
  return (
    <div 
      className="absolute w-[12%] left-[2%] bottom-[2%] text-white rounded-lg "
    >
      <div className="flex justify-between w-full mb-[2%]">
        <button className="w-full bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-gray-600 dynamic-text">ADD CHIPS</button>
      </div>
      <div className="flex justify-between w-full mb-[2%]">
        <button className="w-full bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-green-500 dynamic-text">SIT OUT</button>
      </div>
      <div className="flex justify-between w-full mb-[2%]">
        <button className="w-full bg-gray-700 py-[1%] px-[2%] rounded-md hover:bg-blue-500 dynamic-text">LEAVE</button>
      </div>
    </div>
  );
};

export default SitButtons;
