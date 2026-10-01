## Build locally

From root directoy:

```
  docker buildx build --progress=plain --no-cache -t ghcr.io/voltcrash/oxytype-backend:latest . -f  ./docker/backend/Dockerfile
  docker buildx build --progress=plain --no-cache -t  ghcr.io/voltcrash/oxytype-frontend:latest . -f  ./docker/frontend/Dockerfile
```
