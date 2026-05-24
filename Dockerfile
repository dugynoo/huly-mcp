# Minimal Dockerfile for Glama.ai introspection.
#
# The published bundle dist/index.cjs runs as a single-file MCP server over
# stdio. Glama only needs the server to start and respond to introspection,
# so we install the npm package globally and exec it on container start.

FROM node:20-alpine

LABEL org.opencontainers.image.source="https://github.com/dugynoo/huly-mcp"
LABEL org.opencontainers.image.description="MCP server for Huly with task type support and Process plugin tools"
LABEL org.opencontainers.image.licenses="MIT"

RUN npm install --global @dugynoo/huly-mcp@latest

ENV HULY_URL=""
ENV HULY_WORKSPACE=""
ENV HULY_TOKEN=""

ENTRYPOINT ["npx", "-y", "@dugynoo/huly-mcp"]
