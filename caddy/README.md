# Custom Caddy Build with Cloudflare DNS Plugin

This directory contains a custom Dockerfile for Caddy that includes the Cloudflare DNS provider plugin, which is required for DNS-01 ACME challenges with Cloudflare.

## What's Included

- Base: `caddy:2-builder` for building
- Plugin: `github.com/caddy-dns/cloudflare` for Cloudflare DNS challenges
- Final image: `caddy:2-alpine` with the custom build

## Usage

The docker-compose.yml automatically builds this custom image. No additional steps required.

## Configuration

To use the Cloudflare DNS challenge, ensure your Caddyfile has:

```caddy
yourdomain.com {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    # ... rest of config
}
```

And set `CLOUDFLARE_API_TOKEN` in your `.env` file.

