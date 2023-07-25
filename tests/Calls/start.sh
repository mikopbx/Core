#
# Copyright © MIKO LLC - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential
# Written by Alexey Portnov, 10 2020
#

function echo_header() {
    echo -e "\e[01;35m${1}\e[0m";
}

function echo_info() {
    echo -e "\e[01;32m-> \e[0m${1}";
}

echo_header 'Init asterisk...';
dirName="$(realpath "$(dirname "$0")")";
/bin/mount -o remount,rw /offload/
############################################################
##### Setup configs
# Убиваем старый процесс.
echo_header 'Setup configs...';
dumpConfFile='/storage/usbdisk1/mikopbx/tmp/mikopbx.db';
confFile='/cf/conf/mikopbx.db';
testConfFile="$dirName/db/mikopbx.db";
cp "$confFile" "$dumpConfFile"

debugParams="$XDEBUG_CONFIG";
if [ "${debugParams}x" != "x" ]; then
  # Отключаем отладку
  export XDEBUG_CONFIG="${EMPTY}";
fi;

if [ "${1}x" = 'x' ]; then
  echo_info "Copy tests config...";
  sqlite3 "$testConfFile" 'delete from m_LanInterfaces';
  sqlite3 "$dumpConfFile" .dump | grep m_LanInterfaces | grep 'INTO m_LanInterfaces' | sqlite3 "$testConfFile"
  cp "$testConfFile" "$confFile"
  echo_info 'Restart services...';
  php -f "$dirName/db/updateDb.php" > /dev/null 2> /dev/null;
  sleep 5;
  echo_info 'Wait booted asterisk...';
  asterisk -rx 'core waitfullybooted' > /dev/null 2> /dev/null;
fi;
############################################################

pidDir="${dirName}/run/asterisk.pid";
if [ -f "$pidDir" ]; then
  # Убиваем старый процесс.
  kill "$(cat "$pidDir")";
fi;

# Создаем новый asterisk.conf исходя из директории тестового скрипта.
escapeDirName=$(echo "$dirName" | sed "s/\//\\\\\//g");
sed "s/PATH/$escapeDirName/" < "${dirName}/asterisk/asterisk-pattern.conf" > "${dirName}/asterisk/asterisk.conf"

# start asterisk.
astConf="${dirName}/asterisk/asterisk.conf";
echo_info "New config file $astConf...";
/usr/sbin/asterisk -C "$astConf";
echo_info "Waiting start asterisk...";
sleep 1;
# Ожидаем запуска Asterisk.
echo_info "Waiting fully boot asterisk...";
/usr/sbin/asterisk -C "$astConf" -rx 'core waitfullybooted' > /dev/null;
echo_info 'End init';
echo;

export USER_AGENT="mikopbx-test-$(date +'%s')";
export astConf dirName;
initTests=$(/bin/find "${dirName}/Scripts" -type f -name "start.php" | /bin/sort | grep '/00-');

export XDEBUG_CONFIG="${debugParams}";
if [ "$1" != '' ]; then
  # Выполняем только конкретные тесты
  tests=$(/bin/find "${dirName}/Scripts" -type f -name "start.php" | /bin/sort | grep -v '/00-' | grep "/${1}");
else
  # Все тесты.
  tests=$(/bin/find "${dirName}/Scripts" -type f -name "start.php" | /bin/sort | grep -v '/00-');
fi

tests="$initTests $tests"
for file in $tests; do
  /usr/bin/timeout 300 /usr/bin/php -f "${file}";
done

if [ ! "${2}x" == "x" ]; then
  echo_info "Need sleep ${2}";
  sleep "${2}";
fi;

/usr/sbin/asterisk -C "$astConf" -rx 'core stop now' > /dev/null;

############################################################
##### Restore configs
echo_header "Restore configs...";
cp "$dumpConfFile" "$confFile";
if [ "$1x" == 'x' ]; then
  # Отключаем отладку
  if [ "${debugParams}x" != "x" ]; then
    export XDEBUG_CONFIG="${EMPTY}";
  fi;
  php -f "$dirName/db/updateDb.php" /dev/null 2> /dev/null;
  # Возвращаем обратно настройки отладки.
  export XDEBUG_CONFIG="${debugParams}";
fi;
############################################################
