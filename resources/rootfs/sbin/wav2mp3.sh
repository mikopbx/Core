#!/bin/sh
#
# MikoPBX - free phone system for small business
# Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

# $1 - filename without extension
srcFile="${1}.wav";
srcIn="${1}_in.wav";
srcOut="${1}_out.wav";
dstFile="${1}.mp3";

exitCode=0;

if [ -f "$srcIn" ] && [ -f "$srcOut" ]; then
  # Stereo mode.
  dstWavFile="${1}.wav";
  /usr/bin/sox -M "$srcIn" "$srcOut" "$dstWavFile";
  resultSox="$?";
  if [ "$resultSox" = '0' ]; then
    /usr/sbin/mv "$dstWavFile" "$srcFile";
  else
    # Cancel stereo mode.
    echo "Fail convert to stereo file.";
    exitCode=4;
  fi
elif [ ! -f "$srcFile" ]; then
  echo "Src file not found.";
  exit 1;
fi

/usr/bin/lame -b 32 --silent "$srcFile" "$dstFile" && /bin/chmod o+r "$dstFile";
/usr/bin/soxi "$dstFile"  > /dev/null 2> /dev/null;
resultSoxi="$?";
if [ "$resultSoxi" = '0' ]; then
  /usr/sbin/rm -rf "$srcFile" "$srcIn" "$srcOut";
else
  # Error convert to result file.
  exitCode=3;
fi

exit "$exitCode";