import Chip from "./Chip";

const Chips = ({ size, position }: { size: string, position: string }) => {
  return (
    <div className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${size} ${position} flex bg-gray-300 rounded-lg text-gray-800`}>
      <Chip amount={100} color="red" />
      <Chip amount={100} color="red" />
      <Chip amount={100} color="red" />
      <Chip amount={100} color="red" />
    </div>
  );
};

export default Chips;
