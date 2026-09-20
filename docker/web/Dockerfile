FROM node:24-slim

WORKDIR /app

# A fresh named volume mounted here inherits this ownership; the container runs as node.
RUN mkdir -p /app/uploads && chown node:node /app/uploads

RUN apt-get update \
 && apt-get install -y postgresql-client \
 && rm -rf /var/lib/apt/lists/*

COPY docker/web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["sh", "/entrypoint.sh"]