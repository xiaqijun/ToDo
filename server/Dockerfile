FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npx tsc

FROM node:20-alpine

WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/index.js"]
