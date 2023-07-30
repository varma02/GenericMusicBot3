PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d ' ')

docker build -t ghcr.io/varma02/generic-music-bot3:latest .
docker tag "ghcr.io/varma02/generic-music-bot3:latest" "ghcr.io/varma02/generic-music-bot3:$PACKAGE_VERSION"

docker push "ghcr.io/varma02/generic-music-bot3:$PACKAGE_VERSION"
docker push ghcr.io/varma02/generic-music-bot3:latest

