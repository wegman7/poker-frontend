import type { Config } from "tailwindcss";

// this is necessary if you want a grid larger than 12x12
const GRID_ROWS: string = '10';
const GRID_COLS: string = '12';

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      gridTemplateRows: {
        [`${GRID_ROWS}`]: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
      },
      gridTemplateColumns: {
        [`${GRID_COLS}`]: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
      },
      gridRow: {
        [`span-${GRID_ROWS}`]: `span ${GRID_ROWS} / span ${GRID_ROWS}`,
      },
      gridColumn: {
        [`span-${GRID_COLS}`]: `span ${GRID_COLS} / span ${GRID_COLS}`,
      },
      gridRowStart: Object.fromEntries(
        Array.from({ length: parseInt(GRID_ROWS) + 1 }, (_, i) => [i + 1, `${i + 1}`])
      ),
      gridRowEnd: Object.fromEntries(
        Array.from({ length: parseInt(GRID_ROWS) + 1 }, (_, i) => [i + 1, `${i + 1}`])
      ),
      gridColumnStart: Object.fromEntries(
        Array.from({ length: parseInt(GRID_COLS) + 1 }, (_, i) => [i + 1, `${i + 1}`])
      ),
      gridColumnEnd: Object.fromEntries(
        Array.from({ length: parseInt(GRID_COLS) + 1 }, (_, i) => [i + 1, `${i + 1}`])
      ),
    },
  },
  plugins: [],
} satisfies Config;
