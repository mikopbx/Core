#!/bin/sh
### BEGIN INIT INFO
# Provides:          MIKO
# Required-Start:    $all
# Required-Stop:     $all
# Should-Start:      $all
# Should-Stop:       $all
# Default-Start:     5
# Default-Stop:      0 1 2 3 4 6
# Short-Description: Скрипт инициализции MIKOPBX.
### END INIT INFO

NAME='mikopbx'
APP="/etc/rc/mikopbx/mikopbx_boot.php"
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