#!/bin/bash
jcmp() {
  TZ=UTC find $1 -type f | sort | xargs -I {} sh -c 'md5sum --tag "{}" ; stat --printf "%y\n" "{}" ;' | paste -d " " - -
}
