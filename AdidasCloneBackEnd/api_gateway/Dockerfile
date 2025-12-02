# ============================================
# 1) BUILD STAGE
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy file cấu hình
COPY package.json yarn.lock ./

# Cài dependency
RUN yarn install --frozen-lockfile

# Copy toàn bộ source code
COPY . .

# Build NestJS -> output dist/
RUN yarn build


# ============================================
# 2) RUN STAGE (lightweight image)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy file cấu hình
COPY package.json yarn.lock ./

# Cài production dependencies (không cài devDependencies)
RUN yarn install --frozen-lockfile --production=true

# Copy code đã build
COPY --from=builder /app/dist ./dist

# Expose port API Gateway
EXPOSE 3000

# Start project
CMD ["node", "dist/main.js"]
