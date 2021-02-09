#!/bin/bash

count_every=30
truncate_every=90
truncate_dir="/var/log/testing/truncating"
move_create_every=100
move_create_dir="/var/log/testing/movecreate"
symlinks_every=180
symlinks_dangling_every=120
symlinks_source_dir="/tmp/symlinks-source"
symlinks_target_dir="/var/log/testing/symlinks"

current_symlinks_source_dir="$symlinks_source_dir/0_normal"
current_symlinks_dangling_source_dir="$symlinks_source_dir/0_dangling"

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
  local file="$truncate_dir/truncating.log"
  if [ $n -eq 0 ]; then
    # Wait for changes to be consumed
    sleep 1
    echo "-- Truncating step $i"
    : > $file
  fi
  printf "$to_append" >> $file
}

# Move the existing file out of the log dir and recreate log file
move_create_workload () {
  local i=$1
  local n=$(($i%move_create_every))
  local file="$move_create_dir/movecreate.log"

  if [ $n -eq 0 ]; then
    echo "-- Move / create step $i"
    # Wait for changes to be consumed
    sleep 1
    clean_recycle_bin
    mv -f $move_create_dir $recycle_bin

    mkdir $move_create_dir
    : > $file
  fi

  printf "$to_append" >> $file
}

symlink_file_workload () {
  local i=$1
  local n=$(($i%symlinks_every))
  local symlink_file="$symlinks_target_dir/symlinkfile_normal.log"

  if [ $n -eq 0 ]; then
    echo "-- Symlink $i"
    # Wait for changes to be consumed
    sleep 1
    rm -f $symlink_file
    rm -Rf $current_symlinks_source_dir
    current_symlinks_source_dir="$symlinks_source_dir/${i}_normal"
    mkdir -p $current_symlinks_source_dir
    local source_file="$current_symlinks_source_dir/source.log"
    : > $source_file
    ln -s $source_file $symlink_file
  fi

  local source_file="$current_symlinks_source_dir/source.log"
  printf "$to_append" >> $source_file
}

symlink_dangling_file_workload () {
  local i=$1
  local n=$(($i%symlinks_dangling_every))
  local symlink_file="$symlinks_target_dir/symlinkfile_dangling.log"

  if [ $n -eq 0 ]; then
    echo "-- Dangling symlink $i"
    # Wait for changes to be consumed
    sleep 1
    rm -Rf $current_symlinks_dangling_source_dir
    current_symlinks_dangling_source_dir="$symlinks_source_dir/${i}_dangling"
    mkdir -p $current_symlinks_dangling_source_dir
    local source_file="$current_symlinks_dangling_source_dir/source.log"

    # Remove the dangling symlink
    rm -f $symlink_file
    : > $source_file
    ln -s $source_file $symlink_file
  fi

  local source_file="$current_symlinks_dangling_source_dir/source.log"
  printf "$to_append" >> $source_file
}

start () {
  mkdir -p $truncate_dir
  mkdir -p $move_create_dir
  mkdir -p $symlinks_source_dir
  mkdir -p $symlinks_target_dir

  clean_recycle_bin

  curl -sS -X DELETE "http://127.0.0.1/count"

  # ~72h
  for ((i=0; i<2592000; i++))
  do
    sleep 0.1

    truncate_workload $i
    move_create_workload $i
    symlink_file_workload $i
    symlink_dangling_file_workload $i

    n=$(($i%count_every))
    if [ $n -eq 0 ]; then
      sleep 1
      sent=$(( 4*i ))
      received=$(curl -sS "http://127.0.0.1/count")
      echo "Sent: $sent; received: $received"
    fi
  done
}

start
