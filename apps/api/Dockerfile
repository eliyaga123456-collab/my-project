# Build from the REPO ROOT:  docker build -f apps/api/Dockerfile -t ear-api .
FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/
COPY packages/tokens/package.json packages/tokens/
RUN npm ci --workspace @unsaid/api
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @unsaid/api

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=4000 AUTO_MIGRATE=true
WORKDIR /repo
# Keep node_modules (incl. tsx so `npm run db:seed -w @unsaid/api` works in a shell on the container).
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/app/server.js"]
