#!/bin/bash

echo 'pm2 kill:'
pm2 kill
echo 'pm2 flush:'
pm2 flush
echo 'start proxy:'
pm2 start npm --name proxy --watch ./pm2tostart -- start
echo 'start proxy1:'
pm2 start npm --name proxy1 --watch ./pm2tostart -- run start_1

echo 'start daemon:'
pm2 start node --name daemon -- ./bin/daemon.js
# echo 'start update:'
# pm2 start node --name update -- ./bin/update