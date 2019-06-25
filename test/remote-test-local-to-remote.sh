#!/bin/bash
set -e
set -x

if [ $# -eq 0 ]; then
  echo "missing required remote host parameter. usage: ./remote-test.sh 192.168.56.132"
  exit 1
fi

#REMOTE_IP=192.168.56.132
REMOTE_IP=$1
REMOTE_USER=jarhar
SSH_CMD=ssh ${REMOTE_USER}@${REMOTE_IP}
REMOTE() {
  $SSH_CMD "cd pismo/test && source remote-test-shared-config.sh && $@"
}

# clean up stuff from previous test runs
rm -rf out1 || true
REMOTE rm -rf out2 || true
pismo remove test1 || true
REMOTE pismo remove test2 || true

# set up remote
pismo remote remove test_remote || true
pismo remote add test_remote http://${REMOTE_IP}:48880

# set up out1
touch --date=@1524222671 data1/420am
touch --date=@1524222671 -a data1/420a
touch --date=@1524222671 -m data1/420m
cp -r -p data1 out1

# create expected output files
REMOTE cp -r -p data1 out2
jcmp out1 > out1-expected.txt
REMOTE jcmp out2 > out2-expected.txt # this outputs to file locally, not remotely
REMOTE rm -rf out2

# set up out2
REMOTE find data2 -type f | xargs touch # TODO how do i internally pipe stuff? do i have to put quotes around it?
