FROM git.whdei.com:5050/autolabeling/fe-management/base-node:22-bookworm-slim AS build

WORKDIR /app
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
COPY package.json yarn.lock .yarnrc.yml ./
# COPY .yarn/ .yarn/
RUN corepack enable \
    && corepack prepare yarn@4.16.0 --activate \
    && yarn config set npmRegistryServer https://registry.npmmirror.com \
    && yarn install --immutable

COPY . .
RUN yarn build

FROM git.whdei.com:5050/autolabeling/fe-management/base-nginx:1.22

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
