#!/usr/bin/env bash

# build for amd64
docker buildx build --platform linux/amd64 \
  -t gcr.io/poker-451119/frontend:v1 \
  --push .
docker run -d -p 3000:3000 --env-file=.env.prod gcr.io/poker-451119/frontend:v1
