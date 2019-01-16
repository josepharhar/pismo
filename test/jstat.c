#include <unistd.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>
#include <stdio.h>
#include <sys/stat.h>

void main(int argc, char** argv) {
  if (argc != 2) {
    printf("two args required, found: %d\n", argc);
    exit(1);
  }

  struct stat stats;
  memset(&stats, 0, sizeof(struct stat));
  int stat_result = stat(argv[1], &stats);
  if (stat_result) {
    printf("stat() returned: %d\n", stat_result);
    exit(1);
  }

  printf("mtime seconds.nanoseconds: %d.%d\n", stats.st_mtim.tv_sec, stats.st_mtim.tv_nsec);
}
