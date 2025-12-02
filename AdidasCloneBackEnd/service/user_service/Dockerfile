# ============================================
# 1) BUILD STAGE
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Cài thêm packages để build bcrypt (native module)
RUN apk add --no-cache python3 make g++

# Copy package configs
COPY package.json yarn.lock ./

# Install all deps (include dev for prisma + typescript)
RUN yarn install --frozen-lockfile

# Copy toàn bộ source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS → dist/
RUN yarn build


# ============================================
# 2) RUN STAGE (production)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package.json + yarn.lock
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production=true

# Copy prisma client từ builder stage
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

# Copy prisma schema folder
COPY prisma ./prisma

# Copy dist build
COPY --from=builder /app/dist ./dist



COPY firebase-admin-key.json ./firebase-admin-key.json

# Expose port (nếu có REST auth)
EXPOSE 3001

# Start microservice
CMD ["node", "dist/main.js"]
