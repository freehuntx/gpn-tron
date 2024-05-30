FROM node:18

WORKDIR /app
COPY . ./
RUN yarn install

EXPOSE 3000
EXPOSE 4001
EXPOSE 4000

CMD sh -c "yarn dev"
