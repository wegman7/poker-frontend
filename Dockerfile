# Stage 1: Build the Next.js app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies (copies package.json and package-lock.json/yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Build the Next.js app (this creates the .next folder)
RUN npm run build

# Stage 2: Run the Next.js app
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only the production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the built Next.js files and public assets from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

# Expose the port your Next.js app will run on
EXPOSE 3000

# Start the Next.js app in production mode
CMD ["npm", "start"]
