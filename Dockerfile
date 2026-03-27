# Use a base Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy root package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies (on root and server)
RUN npm install
RUN cd server && npm install

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to start the app
CMD [ "npm", "start" ]
