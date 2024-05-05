# Use an official Node runtime as a parent image
FROM node:14 AS build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Bundle app source
COPY . .

# Build the app
RUN npm run build --prod

# Use Nginx to serve the app
FROM nginx:stable-alpine

# Copy the build output to replace the default Nginx content.
COPY --from=build /app/dist/my-angular-app /usr/share/nginx/html

# Expose port 80
EXPOSE 80