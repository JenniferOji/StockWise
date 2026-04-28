FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install -g serve

COPY . .

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

EXPOSE 3000

CMD ["sh", "-c", "npx expo export && npx serve dist -l 3000"]