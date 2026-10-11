FROM alpine:3.22.2 AS downloader

ARG PB_VERSION=0.40.5
ARG TARGETARCH

RUN apk add --no-cache ca-certificates curl unzip \
    && case "${TARGETARCH}" in \
         amd64) PB_ARCH="amd64" ;; \
         arm64) PB_ARCH="arm64" ;; \
         *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
       esac \
    && curl --fail --location --silent --show-error \
       "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
       --output /tmp/pocketbase.zip \
    && unzip /tmp/pocketbase.zip -d /tmp/pocketbase

FROM alpine:3.22.2

RUN apk add --no-cache ca-certificates \
    && addgroup -S pocketbase \
    && adduser -S -G pocketbase -h /pb pocketbase

WORKDIR /pb

COPY --from=downloader /tmp/pocketbase/pocketbase /pb/pocketbase
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY entrypoint.sh /pb/entrypoint.sh

RUN mkdir -p /pb/pb_data \
    && chmod +x /pb/entrypoint.sh \
    && chown -R pocketbase:pocketbase /pb

USER pocketbase

EXPOSE 8090

ENTRYPOINT ["/pb/entrypoint.sh"]
