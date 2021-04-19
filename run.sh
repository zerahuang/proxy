#!/bin/bash

echo 'stop proxy:'
pm2 stop proxy
echo 'delete proxy:'
pm2 delete proxy
echo 'stop daemon:'
pm2 stop daemon
echo 'delete daemon:'
pm2 delete daemon

echo 'stop update:'
pm2 stop update
echo 'delete update:'
pm2 delete update

echo 'pm2 flush:'
pm2 flush
echo 'start proxy:'
pm2 start npm --name proxy --watch ./pm2tostart -- start -i 4
echo 'start daemon:'
pm2 start node --name daemon -- ./bin/daemon.js
echo 'start update:'
pm2 start node --name update -- ./bin/update