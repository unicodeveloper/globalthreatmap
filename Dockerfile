FROM node:20-alpine

RUN apk add --no-cache git
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

RUN git clone https://github.com/unicodeveloper/globalthreatmap.git .

RUN pnpm install --frozen-lockfile || pnpm install

# Only NEXT_PUBLIC_ vars need build-time inlining (client bundle)
# Server-side secrets (API keys etc) are injected at runtime by Railway
ARG NEXT_PUBLIC_APP_MODE
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_REDIRECT_URI
ARG NEXT_PUBLIC_VALYU_AUTH_URL
ARG NEXT_PUBLIC_VALYU_CLIENT_ID

ENV NEXT_PUBLIC_APP_MODE=$NEXT_PUBLIC_APP_MODE
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_REDIRECT_URI=$NEXT_PUBLIC_REDIRECT_URI
ENV NEXT_PUBLIC_VALYU_AUTH_URL=$NEXT_PUBLIC_VALYU_AUTH_URL
ENV NEXT_PUBLIC_VALYU_CLIENT_ID=$NEXT_PUBLIC_VALYU_CLIENT_ID

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
