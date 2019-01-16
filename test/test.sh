#!/usr/bin/zsh
set -e
set -x

jcmp() {
  find $1 -type f -exec sh -c 'md5sum --tag "{}" ; stat --printf="%y\n" "{}" ;' \; | paste -d " " - -
}

rm -rf out1 out2 || true
pismo remove test1 || true
pismo remove test2 || true

cp -r -p data1 out1
find out1 -type f | xargs touch
cp -r -p data1 out2
jcmp out1 > out1-expected.txt
jcmp out2 > out2-expected.txt
rm -rf out2
cp -r -p data2 out2

pismo add test1 out1
pismo add test2 out2
pismo update test1
pismo update test2

pismo merge-gen test1 test2 merge.json
pismo merge-apply merge.json

jcmp out1 > out1-actual.txt
jcmp out2 > out2-actual.txt

diff out1-expected.txt out1-actual.txt
diff out2-expected.txt out2-actual.txt

echo "success"
