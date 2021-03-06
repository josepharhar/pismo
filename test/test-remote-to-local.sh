#!/bin/bash
set -e
set -x

jcmp() {
  find $1 -type f -exec sh -c 'md5sum --tag "{}" ; stat --printf="%y\n" "{}" ;' \; | paste -d " " - -
}

# clean up stuff from previous test runs
pismo remove test1 || true
pismo remove test2 || true
rm -rf out1 out2 || true

# set up remote
pismo remote-remove local || true
pismo remote-add local http://localhost:48880

# set up out1
touch --date=@1524222671 data1/420am
touch --date=@1524222671 -a data1/420a
touch --date=@1524222671 -m data1/420m
cp -r -p data1 out1

# create expected output files
cp -r -p data1 out2
jcmp out1 > out1-expected.txt
jcmp out2 > out2-expected.txt
rm -rf out2

# set up out2
find data2 -type f | xargs touch
cp -r -p data2 out2

# scan with pismo
pismo add test1 out1
pismo add test2 out2
pismo update test1
pismo update test2

# update remote
pismo fetch local

# copy with pismo
pismo merge-gen local/test1 test2 merge.json
pismo merge-apply merge.json

# create actual output
jcmp out1 > out1-actual.txt
jcmp out2 > out2-actual.txt

# compare
diff out1-expected.txt out1-actual.txt
diff out2-expected.txt out2-actual.txt

# clean up
pismo remove test1
pismo remove test2
pismo remote-remove local

echo "test passed successfully"
