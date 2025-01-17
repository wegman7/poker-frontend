import Chip from "./Chip";

const brownValue = .25;
const grayValue = 1;
const redValue = 5;
const greenValue = 25;

const calculateAmounts = (amount: number) => {
  const green = Math.floor(amount / greenValue);
  amount -= green * greenValue;
  const red = Math.floor(amount / redValue);
  amount -= red * redValue;
  const gray = Math.floor(amount / grayValue);
  amount -= gray * grayValue;
  const brown = Math.floor(amount / brownValue);

  return { gray, brown, red, green };
}

const Chips = ({ size, position, amount }: { size: string, position: string, amount: number }) => {
  const { gray, brown, red, green } = calculateAmounts(amount);

  return (
    <div className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${size} ${position} flex bg-gray-300 rounded-lg text-gray-800`}>
      <Chip amount={brown} color="brown" />
      <Chip amount={gray} color="gray" />
      <Chip amount={red} color="red" />
      <Chip amount={green} color="green" />
    </div>
  );
};

export default Chips;
