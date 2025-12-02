# ============================
# 1. BUILD STAGE
# ============================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies
RUN npm install

# Copy toàn bộ source code
COPY . .

# Build production (xóa dist cũ để tránh lỗi cache)
RUN rm -rf dist && npm run build


# ============================
# 2. PRODUCTION STAGE (NGINX)
# ============================
FROM nginx:alpine

# Copy custom nginx config (fix SPA 404)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output sang nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
