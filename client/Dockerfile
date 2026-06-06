FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and config
COPY . .

# Expose port
EXPOSE 5173

# Run development server
CMD ["npm", "run", "dev"]
