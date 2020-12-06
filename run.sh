#!/bin/bash

echo 'stop proxy:'
pm2 stop proxy
echo 'delete proxy:'
pm2 delete proxy
echo 'stop daemon:'
pm2 stop daemon
echo 'delete daemon:'
pm2 delete daemon
echo 'pm2 flush:'
pm2 flush
echo 'start proxy:'
pm2 start npm --name proxy --watch ./pm2tostart -- start
echo 'start daemon:'
pm2 start node --name daemon -- ./bin/daemon.js