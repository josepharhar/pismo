#!/bin/bash
set -e
set -x

REMOTE_IP=192.168.56.132
REMOTE_USER=jarhar
SSH_CMD=ssh ${REMOTE_USER}@${REMOTE_IP}
CD_CMD=cd pismo/remote-test

$SSH_CMD (cd 
