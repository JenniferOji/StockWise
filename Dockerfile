FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV EXPO_PUBLIC_API_URL=http://backend:8080

EXPOSE 3000

CMD ["npx", "expo", "start", "--web", "--port", "3000", "--non-interactive"]