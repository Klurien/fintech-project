FROM node:20-alpine

# Set working directory to the adapter directory
WORKDIR /app/adapters/timescale-sink-adapter

# Copy the frontend prisma schema into the container's frontend path
COPY frontend/prisma /app/frontend/prisma

# Copy the adapter's package.json
COPY adapters/timescale-sink-adapter/package.json .

# Install dependencies (including Prisma)
RUN npm install

# Copy the actual adapter code
COPY adapters/timescale-sink-adapter/index.js .

# Generate the Prisma client using the shared schema
RUN npx prisma generate --schema=/app/frontend/prisma/schema.prisma

CMD ["node", "index.js"]
