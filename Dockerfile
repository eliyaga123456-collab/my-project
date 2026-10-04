# One container = the whole product: Next.js website on $PORT (public) + Fastify API on 127.0.0.1:4000 (private).
# The website proxies /api/v1 and /media to the API, so the browser sees ONE origin (cookies just work, no CORS).
# Build from the repo root:  docker build -t ear .
FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/
COPY packages/tokens/package.json packages/tokens/
# Only the website, the API and the shared packages belong in this image (no mobile/admin toolchains).
# Dropping the other workspaces keeps the lockfile's versions but lets npm hoist shared deps (react, next) to the root.
RUN node -e "const fs=require('fs');const p=require('./package.json');p.workspaces=['apps/api','apps/web','packages/*'];fs.writeFileSync('package.json',JSON.stringify(p,null,2))" \
 && npm install --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
COPY apps/web apps/web
# The API is always reachable at localhost inside this container (baked into the Next.js rewrites).
ENV NEXT_TELEMETRY_DISABLED=1 API_URL=http://localhost:4000
RUN npm run build -w @unsaid/api && npm run build -w @unsaid/web

FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 AUTO_MIGRATE=true PORT=3000 MEDIA_DIR=/repo/.data/media
WORKDIR /repo
COPY --from=build /repo /repo
COPY deploy/start-combined.sh /usr/local/bin/start-combined
RUN chmod +x /usr/local/bin/start-combined && mkdir -p /repo/.data/media && chown -R node:node /repo
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["start-combined"]
