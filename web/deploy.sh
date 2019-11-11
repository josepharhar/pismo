#!/bin/bash
set -x
set -e

npm run build
rm -rf ~/pismo-gh-pages
mkdir ~/pismo-gh-pages
cp -r build/* ~/pismo-gh-pages
cd ~/pismo-gh-pages
git init
git checkout -b gh-pages
echo "pismo.jarhar.com" > CNAME
git add .
git commit -m "github pages website"
git remote add origin git@github.com:josepharhar/pismo
git push -f origin gh-pages
