# Image de développement : sert Vite avec HMR.
# La production ne fait pas tourner ce conteneur — voir Dockerfile.prod, qui
# produit des fichiers statiques servis par Caddy.
FROM node:22-alpine

WORKDIR /app

# .npmrc porte legacy-peer-deps=true, sans quoi npm ci échoue :
# gantt-task-react exige React 18, le projet est en React 19.
COPY package*.json .npmrc ./
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
