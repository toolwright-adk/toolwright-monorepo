FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY . .
RUN pnpm build

CMD ["node", "dist/main.js"]
