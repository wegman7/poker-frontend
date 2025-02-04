import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-green-900">
      <div className="relative w-32 h-48">
        {/* Animated Card Stack */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-48 bg-white rounded-lg shadow-lg border-2 border-yellow-500"
            initial={{ y: i * -10, rotate: i * -10 }}
            animate={{ y: [i * -10, i * 10, i * -10], rotate: [i * -10, i * 10, i * -10] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: i * 0.2 }}
          />
        ))}
        {/* Loading Text */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xl font-semibold"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          Shuffling...
        </motion.div>
      </div>
    </div>
  );
}
