#!/bin/bash
set -e
set -x

source remote-test-shared-config.sh

if [ $# -eq 0 ]; then
  echo "missing required remote host parameter. usage: ./remote-test.sh 192.168.56.132"
  exit 1
fi

#REMOTE_IP=192.168.56.132
REMOTE_IP=$1
REMOTE_USER=jarhar
SSH_CMD="ssh ${REMOTE_USER}@${REMOTE_IP}"
SFTP_CMD="sftp ${REMOTE_USER}@${REMOTE_IP}:"
REMOTE() {
  $SSH_CMD "cd pismo/test && source remote-test-shared-config.sh && $@"
}
REMOTE_QUOTE() {
  $SSH_CMD "\"cd pismo/test && source remote-test-shared-config.sh && $@"
}

# clean up stuff from previous test runs
REMOTE rm -rf out1 out2 || true
rm -rf out1 out2 || true
REMOTE pismo remove test1 || true
REMOTE pismo remove test2 || true
pismo remove test1 || true
pismo remove test2 || true

# set up remote
pismo remote-remove test_remote || true
pismo remote-add test_remote http://${REMOTE_IP}:48880

# set up out1
REMOTE touch --date=@1524222671 data1/420am
REMOTE touch --date=@1524222671 -a data1/420a
REMOTE touch --date=@1524222671 -m data1/420m
REMOTE cp -r -p data1 out1

# create expected output files
cp -r -p data1 out2
REMOTE jcmp out1 > out1-expected.txt
jcmp out2 > out2-expected.txt
rm -rf out2

# set up out2
find data2 -type f | xargs touch
cp -r -p data2 out2

# scan with pismo
pismo add test2 out2
pismo update test2
$SSH_CMD << EOF
cd pismo/test
pismo add test1 out1
pismo update test1
EOF

# update remote
pismo fetch test_remote

# copy with pismo
pismo merge-gen test_remote/test1 test2 merge.json
pismo merge-apply merge.json

# create actual output
jcmp out2 > out2-actual.txt
REMOTE jcmp out1 > out1-actual.txt

# compare
diff out1-expected.txt out1-actual.txt
#jcmp out2 | sed 's/out2/out1/g' > out2-expected.txt
jcmp out2 > out2-expected.txt
diff out2-expected.txt out2-actual.txt

# clean up
pismo remote-remove test_remote || true

echo "test passed successfully"
