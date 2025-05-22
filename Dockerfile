FROM node:24-alpine3.20 AS builder

COPY . .

RUN npm install
RUN npm run build

FROM node:22-slim
WORKDIR /app

RUN npx playwright install --with-deps chromium

COPY --from=builder ./node_modules ./node_modules
COPY --from=builder ./dist .

CMD ["node", "index.js"]
