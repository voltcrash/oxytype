#!/bin/sh
cd  /usr/share/nginx/html
echo "use backend url ${OXYTYPE_BACKEND_URL}"
sed -i "s/###OXYTYPE_BACKEND_URL###/${OXYTYPE_BACKEND_URL//\//\\/}/g" js/*.js

echo "use recaptcha ${RECAPTCHA_SITE_KEY}"
sed -i "s/###RECAPTCHA_SITE_KEY###/${RECAPTCHA_SITE_KEY//\//\\/}/g" js/*.js
