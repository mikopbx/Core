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

### BEGIN INIT INFO
# Provides:          MIKO
# Required-Start:    $all
# Required-Stop:     $all
# Should-Start:      $all
# Should-Stop:       $all
# Default-Start:     5
# Default-Stop:      0 1 2 3 4 6
# Short-Description: Script for MIKOPBX initialization.
### END INIT INFO

NAME='mikopbx'
APP="/etc/rc/bootup"
ARGS=""

case "$1" in
  start)
$APP $ARGS
	;;
  stop)
	echo "$NAME."
	;;

  *)
	N=/etc/init.d/$NAME
	echo "Usage: $N {start|stop}" >&2
	exit 1
	;;
esac

exit 0