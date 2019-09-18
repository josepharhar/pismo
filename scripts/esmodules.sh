#!/bin/bash

for i in *.js
do
  sed -i 's/const \(.*\) = require(\(.*\));/import * as \1 from \2;/g' $i
  sed -i 's/exports\.\(.*\) = \(.*\)(/export \2 \1(/g' $i
  sed -i 's/exports\.\(.*\) = class/export class \1/g' $i
  sed -i 's/export new Method \(.*\)(/export const \1 = new Method(/g' $i
done
