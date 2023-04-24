#!/bin/bash

PORT=$(grep "putport" conf.json | cut -d':' -f2 | sed 's/[ ,]//g')

netstat -ntac 2>/dev/null | grep $PORT
