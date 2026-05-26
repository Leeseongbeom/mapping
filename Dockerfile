FROM node:22-alpine

WORKDIR /app
COPY package.json server.js index.html app.js styles.css supply-data.js ./
COPY data ./data

ENV PORT=4174
EXPOSE 4174

CMD ["node", "server.js"]
