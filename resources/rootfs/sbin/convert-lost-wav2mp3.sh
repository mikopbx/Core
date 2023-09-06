#!/bin/sh
#
# MikoPBX - free phone system for small business
# Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with this program.
# If not, see <https://www.gnu.org/licenses/>.
#

# Check if another process is already running
/bin/ps -A -f | grep 'convert-lost-wav2mp3' | grep -v $$ | grep -v grep > /dev/null;
if [ "$?" != '1' ];then
    echo 'Another process is already running';
    exit 2;
fi;

dir="$1";
if [ ! -d "$dir" ]; then
  exit 1;
fi;

files="$(find "$dir" -name "*.wav" -not -path "*_in.wav" -not -path "*_out.wav" | rev | cut -f 2- -d '.' | rev)";
for filename in $files ; do
  lsof "$filename.wav" > /dev/null;
  lsofResult="$?";
  /bin/busybox ps | /bin/busybox grep wav2mp3 | /bin/busybox grep "$filename";
  processNotExists="$?";
  if [ "$lsofResult" = "1" ] && [ "$processNotExists" = '1' ]; then

      # File is not being used
      /usr/bin/nice -n 19 /sbin/wav2mp3.sh "$filename";
      sleep 0.1;
  fi;
done
