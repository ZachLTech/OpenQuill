FROM node:latest

WORKDIR /app

COPY ./app/package*.json ./
RUN npm install

COPY ./app .
COPY .env .

EXPOSE 3000

CMD ["/bin/bash", "-c", "npx prisma db push;npx prisma generate;npm run build;node .output/server/index.mjs"]