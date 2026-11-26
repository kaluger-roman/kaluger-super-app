FROM ghcr.io/coturn/coturn@sha256:ccdbc51e6f072130b0fc9eebda21f8d026d0a25581746c52557e887818011a3f
USER root
# The configured ports are unprivileged. Copy without the upstream file capabilities.
RUN install -m 0755 /usr/bin/turnserver /usr/local/bin/production-turnserver
USER 1000:1000
