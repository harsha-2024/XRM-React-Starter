
# First-page PDF thumbnailer (WEBP)
FROM alpine:3.19
RUN apk add --no-cache nodejs npm poppler-utils libwebp-tools
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 4100
CMD ["node", "src/index.js"]
