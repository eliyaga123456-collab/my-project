# Build from the REPO ROOT:  docker build -f apps/web/Dockerfile --build-arg API_URL=http://api:4000 -t ear-web .
# API_URL and NEXT_PUBLIC_SITE_URL are baked in at build time (rewrites + CSP).
FROM node:22-bookworm-slim
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/
COPY packages/tokens/package.json packages/tokens/
RUN npm ci --workspace @unsaid/web
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web
ARG API_URL=http://api:4000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV API_URL=$API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @unsaid/web
ENV NODE_ENV=production
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
