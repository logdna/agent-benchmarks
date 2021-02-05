#!/bin/bash

# TODO: Move out of log dir w/ symlinks
#	- create a dir with a file outside of log dir
#	- create a symlink to the log dir
#	- move dir log file to a trash location

truncate_every=20
truncate_folder="/var/log/testing/truncating"
move_create_every=20
move_create_folder="/var/log/testing/movecreate"

to_append="Nov 30 09:14:47 sample-host-name sampleprocess[1204]: Hello from sample process\n"
recycle_bin="/tmp/testing-recycle-bin"

clean_recycle_bin () {
  rm -Rf "$recycle_bin"
  mkdir -p "$recycle_bin"
}

# Truncate the log file and continue inserting immediately
truncate_workload () {
  local i=$1
  local n=$(($i%truncate_every))
  local file="$truncate_folder/truncating.log"
  echo "i: $i; n: $n;"
  if [ $n -eq 0 ]; then
    echo "truncating file"
    : > $file
  fi
  printf "$to_append" >> $file
}

# Move the existing file out of the log dir and recreate log file
move_create_workload () {
  local i=$1
  local n=$(($i%move_create_every))
  local file="$move_create_folder/movecreate.log"


  if [ $n -eq 0 ]; then
    echo "----move-creating folder $i"
    clean_recycle_bin
    mv -f $move_create_folder $recycle_bin

    mkdir $move_create_folder
    : > $file
  fi

  printf "$to_append" >> $file
}

mkdir -p $truncate_folder
mkdir -p $move_create_folder
clean_recycle_bin

# ~72h
for ((i=0; i<2592000; i++))
do
  sleep 0.1
  truncate_workload $i
  move_create_workload $i
done
