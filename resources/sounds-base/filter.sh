#!/bin/sh
#
# MikoPBX - free phone system for small business
# Copyright © 2017-2022 Alexey Portnov and Nikolay Beketov
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

# Чистим файлы из черного списка.
soundsDir="$1";
cut -d ':' -f 1 < "$soundsDir/blacklist.txt" | while IFS= read -r line
do
  rm -rf "${soundsDir:?}"/*/"${line:?}".*;
done

# Оставляем только файлы, которые есть в RU директории.
# -mindepth 1 excludes "$soundsDir" itself (would otherwise be returned by
# find on its starting point at depth 0). Including the top dir caused the
# inner `find ./ -type f` to walk EVERY file recursively, and the
# `${ruDir}${filename}` concatenation (no separator) produced non-existent
# paths so the existence check always failed and the rm branch deleted
# every file. Before the resources/sounds → resources/sounds-base rename,
# the pre-existing `! -name sounds` filter happened to exclude the top
# dir by basename — a coincidence that broke when the basename changed.
ruDir="$soundsDir/ru-ru"
find "$soundsDir" -mindepth 1 -maxdepth 1 -type d ! -name other ! -name moh | while IFS= read -r dirName
do
  ( cd "$dirName" || exit; find ./ -type f ) | sed 's/\.\///' | while IFS= read -r filename
  do
   if [ ! -f "${ruDir}${filename}" ] && [ -f "$dirName${filename}" ]; then
     rm -rf "$dirName${filename}";
   fi;
  done
done