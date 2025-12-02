# ============================
# 1. BUILD STAGE
# ============================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build app
RUN rm -rf dist && npm run build

# ============================
# 2. PRODUCTION STAGE (NGINX)
# ============================
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
