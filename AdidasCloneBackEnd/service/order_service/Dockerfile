# ============================================
# 1) BUILD STAGE
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy file config để optimize cache
COPY package.json yarn.lock ./

# Cài dependencies
RUN yarn install --frozen-lockfile

# Copy toàn bộ source code
COPY . .

# Generate Prisma client (cực kỳ quan trọng cho NestJS + Prisma)
RUN npx prisma generate

# Build NestJS -> dist/
RUN yarn build


# ============================================
# 2) RUN STAGE (Production)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy config
COPY package.json yarn.lock ./

# Chỉ cài các dependency production (tránh cài dev như prisma CLI)
RUN yarn install --frozen-lockfile --production=true

# Copy Prisma schema + generated client (bắt buộc)
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
COPY prisma ./prisma

# Copy dist đã build
COPY --from=builder /app/dist ./dist

# Expose port (microservice không cần nếu không serve HTTP, nhưng cứ để)
EXPOSE 3002

# Start microservice
CMD ["node", "dist/main.js"]
