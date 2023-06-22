FROM node:18.12.1-alpine

WORKDIR /app
COPY . /app

RUN yarn install && yarn cache clean

EXPOSE 3000
EXPOSE 4000

CMD [ "yarn", "dev" ]
