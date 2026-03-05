# NOTE: @toolwright-adk/linear-bootstrap must be published to npm before
# building this image. Run `pnpm publish:all` from the monorepo root first.

FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .
RUN npm run build

CMD ["node", "dist/main.js"]
