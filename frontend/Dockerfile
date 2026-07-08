FROM node:25-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

EXPOSE 3000

ENV PORT=3000

CMD ["npm", "start"]
