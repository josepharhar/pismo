#!/bin/bash

if [ `uname` = 'Darwin' ]; then
  PISMO_OSX=1
fi

if [ -z "$PISMO_OSX" ]; then

  gcc jstat.c -o jstat

  jcmp() {
    find $1 -type f -exec sh -c 'md5sum --tag "{}" ; stat --printf="%y\n" "{}" ;' \; | paste -d " " - -
  }

  pismotouch() {
  }

else
  jcmp() {
    find $1 -type f -exec sh -c 'md5sum --tag "{}" ; stat -f "%y\n" "{}" ;' \; | paste -d " " - -
  }

  jtoucham() {
    touch --date=$1 $2
  }
  jtoucha() {
    touch --date=$1 -a $2
  }
  jtouchm() {
    touch --date=$1 -m $2
  }
fi
