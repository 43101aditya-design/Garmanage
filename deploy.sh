#!/bin/bash
curl -fsSL https://nodejs.org/dist/v20.11.1/node-v20.11.1-darwin-arm64.tar.gz -o node20.tar.gz
mkdir -p node20
tar -xzf node20.tar.gz -C node20 --strip-components=1
export PATH="$(pwd)/node20/bin:$PATH"
npm i -g vercel@latest
vercel deploy --prod --yes --token="$VERCEL_TOKEN"
