#!/bin/bash
jcmp() {
  find $1 -type f -exec sh -c 'md5sum --tag "{}" ; stat --printf="%y\n" "{}" ;' \; | paste -d " " - -
}
