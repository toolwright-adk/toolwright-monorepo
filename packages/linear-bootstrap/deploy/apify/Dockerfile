# NOTE: @toolwright-adk/linear-bootstrap must be published to npm before
# building this image. Run `pnpm publish:all` from the monorepo root first.

FROM node:20-slim AS build
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src/ src/
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/main.js"]
