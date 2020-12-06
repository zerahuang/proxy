#!/bin/bash

echo 'stop proxy:'
pm2 stop proxy
echo 'delete proxy:'
pm2 delete proxy
echo 'pm2 flush:'
pm2 flush
echo 'start proxy:'
pm2 start npm --name proxy --watch ./pm2tostart -- start