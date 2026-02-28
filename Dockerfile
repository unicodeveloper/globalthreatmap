FROM node:20-alpine

RUN apk add --no-cache git
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

RUN git clone https://github.com/unicodeveloper/globalthreatmap.git .

RUN pnpm install --frozen-lockfile || pnpm install

ARG NEXT_PUBLIC_APP_MODE
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_VALYU_CLIENT_ID
ARG NEXT_PUBLIC_VALYU_AUTH_URL
ARG NEXT_PUBLIC_REDIRECT_URI

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
