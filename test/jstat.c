#include <unistd.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>
#include <stdio.h>
#include <sys/stat.h>
#include <errno.h>

int main(int argc, char** argv) {
  if (argc != 2) {
    printf("usage: jstat <filename>\n");
    exit(1);
  }

  struct stat stats;
  memset(&stats, 0, sizeof(struct stat));
  int stat_result = stat(argv[1], &stats);
  if (stat_result) {
    printf("stat() failed. returned: %d, strerror: %s\n",
        stat_result, strerror(errno));
    exit(1);
  }

  printf("%ld.%ld\n", stats.st_mtimespec.tv_sec, stats.st_mtimespec.tv_nsec);
  return 0;
}
