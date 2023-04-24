#!/bin/bash

HOST=$(grep "putbind" conf.json | cut -d':' -f2 | sed 's/[ ,"]//g')
PORT=$(grep "putport" conf.json | cut -d':' -f2 | sed 's/[ ,"]//g')
USER=$(grep "putuser" conf.json | cut -d':' -f2 | sed 's/[ ,"]//g')
PASS=$(grep "putpass" conf.json | cut -d':' -f2 | sed 's/[ ,"]//g')
AUTH="$USER:$PASS"
#AUTH='ededd:edededded'
POST=data.packet
#POST=/dev/zero

ab -c 100 -n 10000 -A$AUTH -p$POST http://$HOST:$PORT/
