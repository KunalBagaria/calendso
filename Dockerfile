FROM node:14 as deps

WORKDIR /app
COPY package.json yarn.lock ./
COPY prisma prisma
RUN yarn install --frozen-lockfile

FROM node:14 as builder

WORKDIR /app
ARG BASE_URL NEXTAUTH_URL GOOGLE_API_CREDENTIALS DATABASE_URL JWT_SECRET
ENV BASE_URL=$BASE_URL NEXTAUTH_URL=$NEXTAUTH_URL GOOGLE_API_CREDENTIALS=$GOOGLE_API_CREDENTIALS DATABASE_URL=$DATABASE_URL JWT_SECRET=$JWT_SECRET

COPY . .

COPY --from=deps /app/node_modules ./node_modules
RUN yarn build && yarn install --production --ignore-scripts --prefer-offline

FROM node:14 as runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/next-i18next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json

ARG PORT=3000
EXPOSE $PORT

ENTRYPOINT [ "/bin/sh", "-c", "npx prisma migrate deploy && yarn start"]
