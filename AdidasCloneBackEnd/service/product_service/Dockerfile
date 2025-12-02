# ============================================
# 1) BUILD STAGE
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy file config để tối ưu cache
COPY package.json yarn.lock ./

# Cài dependency
RUN yarn install --frozen-lockfile

# Copy toàn bộ source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS -> dist/
RUN yarn build


# ============================================
# 2) RUN STAGE (Production)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy file config
COPY package.json yarn.lock ./

# Cài dependency production (không cài dev deps như Prisma CLI)
RUN yarn install --frozen-lockfile --production=true

# Copy Prisma client từ builder
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

# Copy Prisma schema folder (để migrations hoặc fallback)
COPY prisma ./prisma

# Copy dist đã build
COPY --from=builder /app/dist ./dist

# Expose port (nếu service có REST cho upload file)
EXPOSE 3003

# Start microservice
CMD ["node", "dist/main.js"]
