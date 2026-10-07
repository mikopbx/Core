#!/bin/sh
# ============================================================================
# miko-cdr-migrate.sh
#
# Универсальный перенос истории звонков FreePBX -> MikoPBX одним скриптом.
# Один и тот же файл запускается на обеих станциях; тип станции определяется
# автоматически (можно форсировать флагом --mode).
#
#   1) На FreePBX:  экспорт истории в master.db (SQLite).
#                   Источник выбирается сам: PT1C_cdr (если модуль установлен),
#                   иначе родная таблица cdr.
#   2) Вручную:     копируем master.db на MikoPBX
#                   в /storage/usbdisk1/mikopbx/freepbx-dmp/
#   3) На MikoPBX:  импорт master.db в cdr_general рабочей базы cdr.db.
#
# Переносится ТОЛЬКО история (БД). Физический перенос/перекодирование файлов
# записей разговоров в этом скрипте не выполняется.
#
# Основан на mysql2sqlite от esperlu (gist 943776), дополнен авто-детектом
# станции, выбором таблицы-источника и импортом в формат MikoPBX.
# ============================================================================

set -eu

# ---------------------------------------------------------------------------
# Параметры по умолчанию (переопределяются переменными окружения или флагами)
# ---------------------------------------------------------------------------
CDRDB="${CDRDB:-asteriskcdrdb}"                  # имя БД CDR в MySQL (FreePBX)

# пути FreePBX
FREEPBX_CONF="${FREEPBX_CONF:-/etc/freepbx.conf}"
AMPORTAL_CONF="${AMPORTAL_CONF:-/etc/amportal.conf}"
FREEPBX_WORKDIR="${FREEPBX_WORKDIR:-/usr/src/miko-mysql-to-sqlite}"

# пути MikoPBX
MIKO_ROOT="${MIKO_ROOT:-/storage/usbdisk1/mikopbx}"
MIKO_CDR_DB="${MIKO_CDR_DB:-$MIKO_ROOT/astlogs/asterisk/cdr.db}"
MIKO_DMP_DIR="${MIKO_DMP_DIR:-$MIKO_ROOT/freepbx-dmp}"
MIKO_REC_BASE="${MIKO_REC_BASE:-$MIKO_ROOT/voicemailarchive/monitor}"

# прочее
MASTER=""                 # путь к master.db (определяется по режиму, можно --master)
FORCE_MODE=""             # freepbx | mikopbx — если задан, детект пропускается
DRY_RUN=0                 # 1 — ничего не менять, только показать SQL/действия
DBUSER="${DBUSER:-}"      # логин MySQL (по умолчанию берётся из конфига FreePBX)
DBPASS="${DBPASS:-}"      # пароль MySQL (по умолчанию берётся из конфига FreePBX)

# ---------------------------------------------------------------------------
# Утилиты
# ---------------------------------------------------------------------------
log()  { printf '[miko-cdr] %s\n' "$*" >&2; }
die()  { printf '[miko-cdr] ОШИБКА: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
# Экранирование строкового литерала SQLite (удвоение одинарных кавычек),
# чтобы путь с символом «'» не ломал ATTACH/INSERT.
sqlq() { printf '%s' "$1" | sed "s/'/''/g"; }

usage() {
	cat >&2 <<'EOF'
Использование: ./miko-cdr-migrate.sh [опции]

Скрипт сам определяет станцию:
  - FreePBX  -> экспорт истории звонков в master.db
  - MikoPBX  -> импорт master.db в рабочую базу cdr.db

Опции:
  --mode=freepbx|mikopbx   Принудительно задать режим (пропустить авто-детект)
  --master=ПУТЬ            Путь к файлу master.db
                           (FreePBX: куда писать; MikoPBX: откуда читать)
  --dry-run                Ничего не менять: показать SQL и запланированные действия
  -h, --help               Эта справка

Переменные окружения (переопределяют дефолты):
  CDRDB, DBUSER, DBPASS, FREEPBX_WORKDIR,
  MIKO_ROOT, MIKO_CDR_DB, MIKO_DMP_DIR, MIKO_REC_BASE
EOF
}

# ---------------------------------------------------------------------------
# Разбор аргументов
# ---------------------------------------------------------------------------
for arg in "$@"; do
	case "$arg" in
		--mode=freepbx|--mode=mikopbx) FORCE_MODE="${arg#--mode=}" ;;
		--master=*)                    MASTER="${arg#--master=}" ;;
		--dry-run)                     DRY_RUN=1 ;;
		-h|--help)                     usage; exit 0 ;;
		*)                             usage; die "неизвестный аргумент: $arg" ;;
	esac
done

# ---------------------------------------------------------------------------
# Определение типа станции
# ---------------------------------------------------------------------------
detect_station() {
	if [ -n "$FORCE_MODE" ]; then
		printf '%s\n' "$FORCE_MODE"
		return
	fi
	if [ -f "$FREEPBX_CONF" ] && have mysqldump && have mysql; then
		printf 'freepbx\n'
	elif [ -d "$MIKO_ROOT" ] && have sqlite3; then
		printf 'mikopbx\n'
	else
		die "не удалось определить тип станции. Укажите режим явно: --mode=freepbx|mikopbx"
	fi
}

# ===========================================================================
# mysql2sqlite (тело gist esperlu/943776, встроено без изменений логики)
# Читает дамп MySQL со stdin, печатает SQLite-совместимый SQL в stdout.
# Вызов mysqldump вынесен наружу (run_freepbx), чтобы его exit-код можно было
# проверить отдельно — иначе сбой дампа в середине пайпа остаётся незамеченным.
# ===========================================================================
mysql2sqlite() {
	awk '
	BEGIN {
		FS=",$"
		print "PRAGMA synchronous = OFF;"
		print "PRAGMA journal_mode = MEMORY;"
		print "BEGIN TRANSACTION;"
	}
	/^\/\*.*CREATE.*TRIGGER/ {
		gsub( /^.*TRIGGER/, "CREATE TRIGGER" )
		print
		inTrigger = 1
		next
	}
	/END \*\/;;/ { gsub( /\*\//, "" ); print; inTrigger = 0; next }
	inTrigger != 0 { print; next }
	/^\/\*/ { next }
	/INSERT/ {
		gsub( /\\\047/, "\047\047" )
		gsub(/\\n/, "\n")
		gsub(/\\r/, "\r")
		gsub(/\\"/, "\"")
		gsub(/\\\\/, "\\")
		gsub(/\\\032/, "\032")
		print
		next
	}
	/^CREATE/ {
		print
		if ( match( $0, /\"[^\"]+/ ) ) tableName = substr( $0, RSTART+1, RLENGTH-1 )
	}
	/^  [^"]+KEY/ && !/^  PRIMARY KEY/ { gsub( /.+KEY/, "  KEY" ) }
	/ KEY/ { gsub(/\([0-9]+\)/, "") }
	/^  / && !/^(  KEY|\);)/ {
		gsub( /AUTO_INCREMENT|auto_increment/, "" )
		gsub( /(CHARACTER SET|character set) [^ ]+ /, "" )
		gsub( /DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP|default current_timestamp on update current_timestamp/, "" )
		gsub( /(COLLATE|collate) [^ ]+ /, "" )
		gsub(/(ENUM|enum)[^)]+\)/, "text ")
		gsub(/(SET|set)\([^)]+\)/, "text ")
		gsub(/UNSIGNED|unsigned/, "")
		if (prev) print prev ","
		prev = $1
	}
	/^(  KEY|\);)/ {
		if (prev) print prev
		prev=""
		if ($0 == ");"){
			print
		} else {
			if ( match( $0, /\"[^"]+/ ) ) indexName = substr( $0, RSTART+1, RLENGTH-1 )
			if ( match( $0, /\([^()]+/ ) ) indexKey = substr( $0, RSTART+1, RLENGTH-1 )
			key[tableName]=key[tableName] "CREATE INDEX \"" tableName "_" indexName "\" ON \"" tableName "\" (" indexKey ");\n"
		}
	}
	END {
		for (table in key) printf key[table]
		print "END TRANSACTION;"
	}
	'
}

# ---------------------------------------------------------------------------
# Чтение реквизитов MySQL из конфигурации FreePBX
# ---------------------------------------------------------------------------
load_db_creds() {
	[ -n "$DBUSER" ] && [ -n "$DBPASS" ] && return 0

	# ВАЖНО: на FreePBX 16 bootstrap из freepbx.conf завершает php ненулевым
	# кодом (значение при этом выводится корректно). '|| true' не даёт set -e
	# оборвать скрипт на присваивании.
	if have php && [ -f "$FREEPBX_CONF" ]; then
		DBUSER="${DBUSER:-$(php -r 'include "'"$FREEPBX_CONF"'"; echo $amp_conf["AMPDBUSER"];' 2>/dev/null || true)}"
		DBPASS="${DBPASS:-$(php -r 'include "'"$FREEPBX_CONF"'"; echo $amp_conf["AMPDBPASS"];' 2>/dev/null || true)}"
	fi

	# FreePBX 12/13 fallback: amportal.conf
	if [ -z "$DBUSER" ] && [ -f "$AMPORTAL_CONF" ]; then
		DBUSER="$(sed -n 's/^AMPDBUSER=//p' "$AMPORTAL_CONF" | head -n1)"
	fi
	if [ -z "$DBPASS" ] && [ -f "$AMPORTAL_CONF" ]; then
		DBPASS="$(sed -n 's/^AMPDBPASS=//p' "$AMPORTAL_CONF" | head -n1)"
	fi

	[ -n "$DBUSER" ] || die "не удалось определить логин MySQL (задайте DBUSER=...)"
	[ -n "$DBPASS" ] || die "не удалось определить пароль MySQL (задайте DBPASS=...)"
}

# ===========================================================================
# Режим FreePBX: экспорт истории в master.db
# ===========================================================================
run_freepbx() {
	load_db_creds

	MASTER="${MASTER:-$FREEPBX_WORKDIR/master.db}"
	mkdir -p "$(dirname "$MASTER")"

	# Выбор таблицы-источника: PT1C_cdr приоритетнее (есть answer/end/id),
	# иначе родная cdr.
	SRC="$(mysql -u"$DBUSER" -p"$DBPASS" -N -e \
		"SELECT table_name FROM information_schema.tables
		 WHERE table_schema='$CDRDB' AND table_name IN ('PT1C_cdr','cdr')
		 ORDER BY (table_name='PT1C_cdr') DESC LIMIT 1;" 2>/dev/null || true)"
	[ -n "$SRC" ] || die "в базе '$CDRDB' не найдено ни PT1C_cdr, ни cdr"

	log "Станция: FreePBX"
	log "БД CDR:  $CDRDB (пользователь: $DBUSER)"
	log "Таблица-источник: $SRC"
	log "Результат: $MASTER"

	if [ "$DRY_RUN" -eq 1 ]; then
		log "[dry-run] экспорт пропущен"
		return 0
	fi

	rm -f "$MASTER"

	# 1) Дамп в отдельный файл — чтобы поймать сбой mysqldump (set -e не ловит
	#    падение в середине пайпа; частичный дамп иначе «успешно» сконвертится).
	DUMP="$FREEPBX_WORKDIR/.dump.$$.sql"
	mkdir -p "$(dirname "$DUMP")"
	if ! mysqldump --compatible=ansi --skip-extended-insert --compact \
			-u"$DBUSER" -p"$DBPASS" "$CDRDB" "$SRC" > "$DUMP"; then
		rm -f "$DUMP"
		die "mysqldump завершился с ошибкой — экспорт прерван (master.db не создан)"
	fi

	# 2) Конвертация. grep -v 'CREATE INDEX' — индексы FreePBX несовместимы.
	if ! mysql2sqlite < "$DUMP" | grep -v 'CREATE INDEX' | sqlite3 "$MASTER" >/dev/null; then
		rm -f "$DUMP" "$MASTER"
		die "конвертация дампа в SQLite не удалась — экспорт прерван"
	fi
	rm -f "$DUMP"

	# 3) Валидация: таблица-источник должна читаться в master.db.
	ROWS="$(sqlite3 "$MASTER" "SELECT COUNT(*) FROM \"$SRC\";" 2>/dev/null || echo '')"
	case "$ROWS" in
		''|*[!0-9]*) rm -f "$MASTER"; die "результат не валиден: таблица $SRC не читается в $MASTER" ;;
	esac
	log "Готово. Экспортировано строк: $ROWS"
	log "Скопируйте $MASTER на MikoPBX в $MIKO_DMP_DIR/ и запустите скрипт там."
}

# ===========================================================================
# Режим MikoPBX: импорт master.db в cdr_general
# ===========================================================================

# Выражение SQLite для пути к записи в формате MikoPBX.
# Универсально и для PT1C_cdr (голое имя файла), и для cdr (абсолютный путь):
#   basename -> без расширения -> подстановка даты из calldate -> .mp3
rec_expr() {
	# basename: часть после последнего '/'
	bn="substr(recordingfile, length(rtrim(recordingfile, replace(recordingfile,'/',''))) + 1)"
	# имя без расширения (если точка есть)
	noext="CASE WHEN ($bn) LIKE '%.%'
	            THEN substr(($bn), 1, length(rtrim(($bn), replace(($bn),'.',''))) - 1)
	            ELSE ($bn) END"
	printf "%s" "CASE
		WHEN recordingfile IS NULL OR recordingfile='' THEN ''
		ELSE '$(sqlq "$MIKO_REC_BASE")/' || strftime('%Y/%m/%d/', calldate) || ($noext) || '.mp3'
	END"
}

# SQL-вставка для источника PT1C_cdr (есть answer/end/id)
sql_from_pt1c() {
	REC="$(rec_expr)"
	cat <<SQL
INSERT INTO cdr_general
	(src_num,dst_num,src_chan,dst_chan,start,answer,endtime,
	 duration,billsec,disposition,UNIQUEID,did,linkedid,recordingfile)
SELECT src, dst, channel, dstchannel, calldate, answer, "end",
	CAST(duration AS INT), CAST(billsec AS INT), disposition,
	linkedid || id, did, linkedid,
	$REC
FROM old.PT1C_cdr;
SQL
}

# SQL-вставка для родной cdr (нет answer/end/id — вычисляем/замещаем)
sql_from_cdr() {
	REC="$(rec_expr)"
	cat <<SQL
INSERT INTO cdr_general
	(src_num,dst_num,src_chan,dst_chan,start,answer,endtime,
	 duration,billsec,disposition,UNIQUEID,did,linkedid,recordingfile)
SELECT src, dst, channel, dstchannel, calldate,
	CASE WHEN CAST(billsec AS INT) > 0
	     THEN datetime(calldate, '+' || (CAST(duration AS INT) - CAST(billsec AS INT)) || ' seconds')
	     ELSE '' END,                                                        -- answer (приближённо)
	datetime(calldate, '+' || CAST(duration AS INT) || ' seconds'),         -- endtime (приближённо)
	CAST(duration AS INT), CAST(billsec AS INT), disposition,
	uniqueid,                                                               -- вместо linkedid||id
	did, linkedid,
	$REC
FROM old.cdr;
SQL
}

run_mikopbx() {
	# По умолчанию ищем master.db в каталоге выгрузки, затем в текущем.
	if [ -z "$MASTER" ]; then
		if   [ -f "$MIKO_DMP_DIR/master.db" ]; then MASTER="$MIKO_DMP_DIR/master.db"
		elif [ -f "./master.db" ];            then MASTER="./master.db"
		else die "master.db не найден. Положите его в $MIKO_DMP_DIR/ или укажите --master=ПУТЬ"
		fi
	fi
	[ -f "$MASTER" ]      || die "файл не найден: $MASTER"
	[ -f "$MIKO_CDR_DB" ] || die "рабочая база MikoPBX не найдена: $MIKO_CDR_DB"

	# Определяем таблицу-источник внутри master.db.
	SRC="$(sqlite3 "$MASTER" \
		"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('PT1C_cdr','cdr')
		 ORDER BY (name='PT1C_cdr') DESC LIMIT 1;" || true)"
	[ -n "$SRC" ] || die "в $MASTER нет ни таблицы PT1C_cdr, ни cdr"

	case "$SRC" in
		PT1C_cdr) INSERT_SQL="$(sql_from_pt1c)" ;;
		cdr)      INSERT_SQL="$(sql_from_cdr)" ;;
	esac

	# Полный скрипт импорта.
	SQL="$(cat <<SQL
ATTACH '$(sqlq "$MASTER")' AS old;
DELETE FROM cdr_general;
$INSERT_SQL
-- подчистка путей с пустым именем файла
UPDATE cdr_general SET recordingfile='' WHERE recordingfile LIKE '%/.mp3';
SQL
)"

	log "Станция: MikoPBX"
	log "Источник: $MASTER (таблица $SRC)"
	log "Цель:     $MIKO_CDR_DB"

	if [ "$DRY_RUN" -eq 1 ]; then
		log "[dry-run] SQL импорта (не выполняется):"
		printf '%s\n' "$SQL" >&2
		return 0
	fi

	log "ВНИМАНИЕ: таблица cdr_general будет ПОЛНОСТЬЮ очищена и перезаполнена."
	log "Запускайте импорт при простое АТС (нет активных звонков/записи CDR)."

	mkdir -p "$MIKO_DMP_DIR"
	WORK="$MIKO_DMP_DIR/cdr.db.work"
	BACKUP="$MIKO_CDR_DB.dmp"

	# Бэкап и рабочую копию снимаем через sqlite .backup — это консистентный
	# снимок даже в режиме WAL (обычный cp потерял бы данные из cdr.db-wal).
	# Прежний cdr.db.dmp не затираем вслепую, а сдвигаем в датированную копию.
	if [ -f "$BACKUP" ]; then
		PREV="$BACKUP.$(date +%Y%m%d%H%M%S)"
		mv "$BACKUP" "$PREV"
		log "Прежний бэкап сохранён: $PREV"
	fi
	rm -f "$WORK"
	sqlite3 "$MIKO_CDR_DB" ".backup '$(sqlq "$BACKUP")'" || die "не удалось создать бэкап рабочей базы"
	log "Бэкап рабочей базы: $BACKUP"
	sqlite3 "$MIKO_CDR_DB" ".backup '$(sqlq "$WORK")'" || die "не удалось подготовить рабочую копию"

	printf '%s\n' "$SQL" | sqlite3 "$WORK" || { rm -f "$WORK"; die "импорт в рабочую копию не удался — база не тронута"; }

	ROWS="$(sqlite3 "$WORK" "SELECT COUNT(*) FROM cdr_general;" 2>/dev/null || echo '')"
	case "$ROWS" in
		''|*[!0-9]*) rm -f "$WORK"; die "рабочая копия невалидна — база не тронута" ;;
	esac

	# Атомарная подмена на том же разделе: mv вместо cp.
	mv "$WORK" "$MIKO_CDR_DB"
	# Снимок .backup — отдельная БД; старые WAL/SHM от прежнего файла убираем,
	# чтобы неконсистентный cdr.db-wal не попортил новую базу при открытии.
	rm -f "$MIKO_CDR_DB-wal" "$MIKO_CDR_DB-shm"

	log "Готово. Записей в cdr_general: $ROWS"
	log "Откат при необходимости: cp '$BACKUP' '$MIKO_CDR_DB'"
	log "История доступна в веб-интерфейсе MikoPBX."
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
MODE="$(detect_station)"
case "$MODE" in
	freepbx) run_freepbx ;;
	mikopbx) run_mikopbx ;;
	*)       die "неизвестный режим: $MODE" ;;
esac
