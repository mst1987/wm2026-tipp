FROM node:22-alpine AS builder
# Robuster gegen abbrechende Netzwerkverbindungen (ECONNRESET) beim Install
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY start.sh ./start.sh
RUN chmod +x start.sh
EXPOSE 3000
CMD ["./start.sh"]
