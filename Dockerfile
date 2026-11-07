# 构建前端
FROM node:24-alpine AS build
WORKDIR /app
COPY client/package*.json client/
RUN cd client && npm install --no-audit --no-fund
COPY client client
RUN cd client && npm run build

# 运行后端（同时托管前端产物）
FROM node:24-alpine
WORKDIR /app
COPY server/package*.json server/
RUN cd server && npm install --production --no-audit --no-fund
COPY server server
COPY --from=build /app/client/dist /app/client/dist
ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/data/forum.db
EXPOSE 4000
CMD ["node", "server/index.js"]
