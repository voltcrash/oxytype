#!/bin/sh
cd  /usr/share/nginx/html
echo "use backend url ${OXYTYPE_BACKEND_URL}"
sed -i "s/###OXYTYPE_BACKEND_URL###/${OXYTYPE_BACKEND_URL//\//\\/}/g" js/*.js

echo "use Turnstile ${TURNSTILE_SITE_KEY}"
sed -i "s/###TURNSTILE_SITE_KEY###/${TURNSTILE_SITE_KEY//\//\\/}/g" js/*.js
