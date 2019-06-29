#!/bin/bash
jcmp() {
  find $1 -type f | sort | xargs -I {} sh -c 'md5sum --tag "{}" ; TZ=UTC stat --printf "%y\n" "{}" ;' | paste -d " " - -
}
