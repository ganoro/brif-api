#!/bin/bash
sudo killall node
sudo forever start -o server server.js
tail -f server