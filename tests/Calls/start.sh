#
# Copyright © MIKO LLC - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential
# Written by Alexey Portnov, 10 2020
#

# sh /root/mikopbx-testing/start.sh
#

echo -e "\e[01;35mInit asterisk...\e[0m";
/bin/mount -o remount,rw /offload/

dirName=$(dirname "$0");
pidDir="${dirName}/run/asterisk.pid";
if [ -f "$pidDir" ]; then
  # Убиваем старый процесс.
  kill "$(cat "$pidDir")";
fi

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
  /usr/bin/timeout 180 /usr/bin/php -f "${file}";
done

if [ ! "${2}x" == "x" ]; then
  echo "Need sleep ${2}";
  sleep "${2}";
fi;

/usr/sbin/asterisk -C "$astConf" -rx 'core stop now' > /dev/null;

