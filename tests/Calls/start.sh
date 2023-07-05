#
# Copyright © MIKO LLC - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential
# Written by Alexey Portnov, 10 2020
#

# sh /root/mikopbx-testing/start.sh
#
echo -e "\e[01;35mInit asterisk...\e[0m";
dirName="$(realpath "$(dirname "$0")")";
/bin/mount -o remount,rw /offload/

############################################################
##### Setup configs
# Убиваем старый процесс.
echo -e "\e[01;35mSetup configs...\e[0m";
dumpConfFile='/storage/usbdisk1/mikopbx/tmp/mikopbx.db';
confFile='/cf/conf/mikopbx.db';
testConfFile="$dirName/db/mikopbx.db";
cp "$confFile" "$dumpConfFile"

if [ "${1}x" = 'x' ]; then
  sqlite3 "$testConfFile" 'delete from m_LanInterfaces';
  sqlite3 "$dumpConfFile" .dump | grep m_LanInterfaces | grep 'INTO m_LanInterfaces' | sqlite3 "$testConfFile"
  cp "$testConfFile" "$confFile"
  php -f "$dirName/db/updateDb.php" /dev/null 2> /dev/null;
  sleep 5;
  asterisk -rx 'core waitfullybooted' /dev/null 2> /dev/null;
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
echo -e "\e[01;32m-> \e[0mNew config file $astConf...";
/usr/sbin/asterisk -C "$astConf";
echo -e "\e[01;32m-> \e[0mWaiting start asterisk...";
sleep 1;
# Ожидаем запуска Asterisk.
/usr/sbin/asterisk -C "$astConf" -rx 'core waitfullybooted' > /dev/null;
echo -e "\e[01;32m-> \e[0mWaiting fully boot asterisk...";
echo -e "\e[01;32m-> \e[0mEnd init";
echo;

export USER_AGENT="mikopbx-test-$(date +'%s')";
export astConf dirName;
initTests=$(/bin/find "${dirName}/Scripts" -type f -name "start.php" | /bin/sort | grep '/00-');

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
  echo "Need sleep ${2}";
  sleep "${2}";
fi;

/usr/sbin/asterisk -C "$astConf" -rx 'core stop now' > /dev/null;

############################################################
##### Restore configs
echo -e "\e[01;35mRestore configs...\e[0m";
cp "$dumpConfFile" "$confFile";
if [ "${1}x" = 'x' ]; then
  php -f "$dirName/db/updateDb.php" /dev/null 2> /dev/null;
fi;

############################################################
