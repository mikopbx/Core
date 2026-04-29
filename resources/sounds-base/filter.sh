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
ruDir="$soundsDir/ru-ru"
find "$soundsDir" -maxdepth 1 -type d ! -name other ! -name moh ! -name sounds | while IFS= read -r dirName
do
  ( cd "$dirName" || exit; find ./ -type f ) | sed 's/\.\///' | while IFS= read -r filename
  do
   if [ ! -f "${ruDir}${filename}" ] && [ -f "$dirName${filename}" ]; then
     rm -rf "$dirName${filename}";
   fi;
  done
done