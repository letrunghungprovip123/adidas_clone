FROM node:20-alpine AS build
WORKDIR /app
COPY package.json nest-cli.json tsconfig.json ./
RUN npm install
COPY apps ./apps
COPY libs ./libs
ARG APP
RUN npx nest build ${APP}

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
ARG APP
ENV APP=${APP}
CMD ["sh", "-c", "node dist/apps/${APP}/main.js"]
