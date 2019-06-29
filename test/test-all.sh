#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NOCOLOR='\033[0m'

run_test() {
  echo -e "${BLUE}running ${1}${NOCOLOR}\n"
  if ./${@}; then
    echo -e "\n${GREEN}${1} passed${NOCOLOR}\n"
  else
    echo -e "\n${RED}${1} failed${NOCOLOR}"
    exit 1
  fi
}

run_test test.sh
run_test test-local-to-remote.sh
run_test test-remote-to-local.sh
run_test remote-test-local-to-remote.sh 192.168.56.132
run_test remote-test-remote-to-local.sh 192.168.56.132

echo -e "${GREEN}all tests passed${NOCOLOR}"
