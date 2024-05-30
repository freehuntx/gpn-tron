FROM node:18.12.1-alpine

WORKDIR /app
COPY . /app

RUN yarn

EXPOSE 3000
EXPOSE 4001
EXPOSE 4000

CMD [ "yarn", "dev" ]
