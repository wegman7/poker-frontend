import Chip from "./Chip";

const x: { [key: string]: string } = {
  brown: '0%',
  gray: '25%',
  red: '50%',
  green: '75%',
};

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

  const yDiff = -6;
  return (
    <div className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${size} ${position} bg-gray-300 rounded-lg text-gray-800`}>
      <div className="relative w-full h-full">
        {[...Array(gray)].map((_, index) => (
          <Chip key={index} amount={brownValue} x={x['brown']} y={(index * yDiff).toString() + '%'} color="brown" />
        ))}
        {[...Array(brown)].map((_, index) => (
          <Chip key={index} amount={grayValue} x={x['gray']} y={(index * yDiff).toString() + '%'} color="gray" />
        ))}
        {[...Array(red)].map((_, index) => (
          <Chip key={index} amount={redValue} x={x['red']} y={(index * yDiff).toString() + '%'} color="red" />
        ))}
        {[...Array(green)].map((_, index) => (
          <Chip key={index} amount={greenValue} x={x['green']} y={(index * yDiff).toString() + '%'} color="green" />
        ))}
      </div>
    </div>
  );
};

export default Chips;
