#!/bin/bash
sudo killall node

sudo forever start -o server server.js
sudo forever start -o redirector redirector.js

tail -f server