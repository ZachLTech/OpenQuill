FROM node:latest

WORKDIR /app

COPY ./app/package*.json ./
RUN npm install

COPY ./app .
COPY .env .

RUN npx prisma db push
RUN npx prisma generate 
RUN npm run build

EXPOSE 3000

CMD ["/bin/bash", "-c", "node .output/server/index.mjs"]