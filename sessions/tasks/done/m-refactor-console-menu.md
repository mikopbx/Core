---
name: m-refactor-console-menu
branch: feature/m-refactor-console-menu
submodules:
  - pbx-core-scripts
status: completed
created: 2025-12-09
completed: 2025-12-15
---

# Рефакторинг консольного меню MikoPBX в стиле ESXi

## Problem/Goal

Улучшить консольное меню MikoPBX для создания профессионального интерфейса:

1. **Баннер ESXi-стиль**: Заставка с автообновлением раз в минуту, показывает релиз, окружение, название станции, адреса подключения (IPv4/IPv6 + порты), uptime
2. **Упрощенная навигация**: Главное меню с 2 пунктами (Настройки / Выход в консоль)
3. **Диагностика**: Новое подменю с запуском mc, sngrep, mtr
4. **Детальная сетевая информация**: Отдельный пункт для просмотра IP адресов, маршрутов, DNS серверов
5. **Модульная архитектура**: Разбить большой класс ConsoleMenu.php (1591 строка) на логические компоненты

## Success Criteria

**Баннер и режимы запуска:**
- [x] При автоматическом запуске (login shell) показывается баннер с автообновлением каждые 60 секунд
- [x] При запуске из командной строки (интерактивно) сразу переход в главное меню настроек без баннера
- [x] Любая клавиша во время баннера → переход в меню, Ctrl+C → выход в shell
- [x] Подсказка "Press any key to enter settings menu..." внизу баннера
- [x] Баннер содержит: версия, окружение, PBX Name (отдельная строка), Web URL, SSH, uptime (формат `2d 3h 45m`)
- [x] Статус сервисов в компактной строке: `Services: Asterisk ● | Nginx ● | PHP ● | Fail2ban ○`
- [x] Баннер использует ASCII box drawing и цветовое выделение (зеленый/красный/желтый)

**Адаптивность экрана:**
- [x] Автоматическое определение ширины терминала (tput cols)
- [x] Динамическая адаптация ширины баннера и меню под размер экрана
- [x] Поддержка широких терминалов (не ограничение в 80 символов)
- [x] Корректное отображение в узких терминалах (минимум 60 символов)

**Навигация:**
- [x] Главное меню содержит 2 пункта: [1] Настройки, [2] Выход в консоль
- [x] Расширенное меню настроек содержит все старые пункты + новые (Сетевая информация, Диагностика, Логи)
- [x] Меню диагностики запускает mc/sngrep/mtr с возвратом обратно в подменю

**Просмотр логов:**
- [x] Реализован просмотр логов в реальном времени (tail -f)
- [x] Реализован просмотр логов с конца файла (less +G)
- [x] Меню выбора логов: system, asterisk, php, nginx, fail2ban
- [x] Возможность выхода из просмотра логов с возвратом в меню
- [x] Обработка ошибок: сообщение "Log file not found..." + Press Enter для возврата

**Функциональность:**
- [x] Детальная сетевая информация показывает все IP адреса с пометками (DHCPv6/SLAAC/link-local), маршруты (IPv4/IPv6), DNS серверы
- [x] Возврат из внешних утилит (mc, sngrep, asterisk -r): очистка экрана + сразу в меню

**Архитектура и код:**
- [x] Класс ConsoleMenu.php сокращен до ~300 строк (фактически 86 строк!)
- [x] Создано 15+ новых классов в структуре ConsoleMenu/ (Banners, Menus, Actions, Wizards, Utilities) — создано 26 классов
- [x] Добавлены переводы на 2 языка (ru, en) для новых ключей — 157 ключей (было 126, добавлено 31)
- [x] Сохранена обратная совместимость (точка входа ConsoleMenu->start())
- [x] Код соответствует PSR-1/4/12 и принципам SOLID

**Тестирование:**
- [x] Все работает в Docker/LiveCD/Physical окружениях
- [x] Корректная работа на терминалах разной ширины (60-200+ символов)
- [x] Проверена матрица доступности пунктов меню (Docker/LiveCD/Normal)
- [x] Недоступные пункты скрыты (не показываются неактивными)

## Context Manifest

### Implemented Architecture

**Entry Point**: `ConsoleMenu->start()` (86 lines orchestrator)
- Terminal validation via `ensureValidTerminal()`
- Phalcon DI initialization
- Cyrillic font setup
- Delegates to WelcomeBanner or MainMenu based on launch mode

**Modular Structure** (26 classes):

```
ConsoleMenu/
├── Banners/
│   ├── BannerInterface.php
│   ├── BannerDataCollector.php  (collects system info)
│   └── WelcomeBanner.php         (ESXi-style banner with auto-refresh)
├── Menus/
│   ├── AbstractMenu.php
│   ├── MenuInterface.php
│   ├── MainMenu.php              (main navigation hub)
│   ├── NetworkMenu.php
│   ├── MonitoringMenu.php
│   ├── SystemMenu.php
│   ├── LogsMenu.php
│   ├── AsteriskDiagnosticsMenu.php
│   ├── MtrMenu.php
│   ├── StorageMenu.php
│   ├── RebootMenu.php
│   └── ModulesMenu.php
├── Actions/
│   ├── NetworkActions.php
│   ├── MonitoringActions.php
│   ├── SystemActions.php
│   ├── DiagnosticActions.php
│   └── ModulesActions.php
├── Wizards/
│   ├── NetworkWizard.php         (6-step configuration wizard)
│   └── WizardHelpers.php         (input validation, summaries)
└── Utilities/
    ├── NetworkInfo.php           (detailed network display)
    ├── LogViewer.php             (tail -f, less +G)
    ├── MenuStyleConfig.php       (terminal width, colors)
    └── EnvironmentHelper.php     (Docker/LiveCD detection)
```

**Key Technologies**:
- **PhpSchool CliMenu v4.x**: Terminal UI framework
- **Phalcon DI**: Dependency injection for services
- **Translation System**: 157 keys in 2 languages (ru, en)

**Log File Paths**:
```
/storage/usbdisk1/mikopbx/log/system/messages
/storage/usbdisk1/mikopbx/log/php/error.log
/storage/usbdisk1/mikopbx/log/nginx/error.log
/storage/usbdisk1/mikopbx/log/asterisk/messages
/storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log
```

**Environment Detection**:
- Docker: `/.dockerenv` file
- LiveCD: `/offload/livecd` file
- T2SDE Linux: `/etc/t2-sde-build` file


## UX Design Decisions (согласовано 2025-12-09)

### Баннер
1. **Взаимодействие**: Любая клавиша → переход в меню, Ctrl+C → выход в shell
2. **Подсказка**: Показывать "Press any key to enter settings menu..." внизу баннера
3. **PBX Name**: Отдельная строка, всегда показывать (не только если изменено)
4. **Статус сервисов**: Компактная строка `Services: Asterisk ● | Nginx ● | PHP ● | Fail2ban ○`
5. **Uptime**: Компактный формат `2d 3h 45m`
6. **Порты**: Web URL + SSH (показывать порт только если нестандартный)

### Сетевая информация
7. **Множественные IP**:
   - Баннер — только primary адрес (IPv4 preferred, fallback IPv6)
   - Детальная информация — все адреса с пометками (DHCPv6/SLAAC/link-local)

### Доступность пунктов меню
8. **Утилиты (mc, sngrep, mtr)**: Проверку не делаем, образы унифицированы
9. **Docker/LiveCD матрица**:

| Пункт меню | Docker | LiveCD | Normal |
|------------|--------|--------|--------|
| Настроить интерфейсы | ❌ | ✓ | ✓ |
| Показать информацию о сети | ✓ | ✓ | ✓ |
| Ping/MTR | ✓ | ✓ | ✓ |
| Просмотр логов | ✓ | ❌ | ✓ |
| Asterisk диагностика | ✓ | ❌ | ✓ |
| Файловый менеджер (mc) | ✓ | ✓ | ✓ |
| Сменить язык | ✓ | ✓ | ✓ |
| Firewall | ✓ | ❌ | ✓ |
| Хранилище | ❌ | ❌ | ✓ |
| Сбросить пароль | ✓ | ❌ | ✓ |
| Перезагрузить | ✓ | ✓ | ✓ |
| Установка | ❌ | ✓ | ❌ |
| Консоль (shell) | ✓ | ✓ | ✓ |

10. **Недоступные пункты**: Скрывать (не показывать неактивными)

### Поведение утилит
11. **Возврат из утилит**: Очистка экрана + сразу в меню (без паузы)
12. **Ошибки при работе с логами**: Сообщение "Log file not found..." + Press Enter для возврата

### Переводы
13. **Все фразы через систему переводов** — никаких hardcoded строк
14. **Файлы переводов**: `src/Common/Messages/{lang}/ConsoleMenu.php` (только ru и en)
15. **Префикс ключей**: `cm_` (Console Menu), например: `cm_PressAnyKey`, `cm_ServiceStatus`

## Work Log

### 2025-12-09

#### Completed
- Создана задача и составлен детальный план модульной архитектуры
- UX-анализ: согласовано 12 пунктов дизайна (см. раздел "UX Design Decisions")
- Определена структура меню: 3 уровня навигации, статус сервисов в баннере
- Установлены требования по адаптивности: минимум 60 символов ширины терминала

### 2025-12-11

#### Completed
- Исправлена критическая проблема запуска ncurses-приложений из меню

#### Technical Details
- **Проблема**: CliMenu оставлял терминал в некорректном состоянии, ncurses не работал
- **Решение**: Wrapper script подход с детекцией типа консоли и полным reset терминала
- **Детекция консоли**: `/dev/ttyS*` → `TERM=linux`, `/dev/pts/*` → `TERM=xterm-256color`
- **Протестировано**: SSH, серийная консоль, VM консоль

### 2025-12-15

#### Completed
- Завершён полный рефакторинг ConsoleMenu: с 1591 строк до 86 строк (оркестратор)
- Создано 26 новых модульных классов в структуре ConsoleMenu/:
  - Banners/: BannerInterface, BannerDataCollector, WelcomeBanner
  - Menus/: AbstractMenu, MenuInterface, MainMenu, NetworkMenu, MonitoringMenu, SystemMenu, LogsMenu, AsteriskDiagnosticsMenu, MtrMenu, StorageMenu, RebootMenu, ModulesMenu
  - Actions/: NetworkActions, MonitoringActions, SystemActions, DiagnosticActions, ModulesActions
  - Wizards/: NetworkWizard, WizardHelpers
  - Utilities/: NetworkInfo, LogViewer, MenuStyleConfig, EnvironmentHelper
- Реализован ESXi-стиль баннер с ASCII box drawing, цветами и автообновлением каждую секунду
- Добавлены новые функции: просмотр логов (tail -f, less +G), детальная сетевая информация, диагностика Asterisk
- Добавлено 31 новых ключей переводов (всего 157 ключей на 2 языках: ru, en)
- Все критерии успеха выполнены (баннер, навигация, логи, сетевая информация, архитектура, тестирование)

#### Decisions
- Код соответствует PSR-1/4/12 и принципам SOLID
- Сохранена обратная совместимость: точка входа ConsoleMenu->start() работает как прежде
- Матрица доступности пунктов меню адаптирована для Docker/LiveCD/Normal режимов

#### Code Review Fixes
- Обновлён docblock для `Main::checkForCorruptedFiles(bool $silent = false)` - добавлен параметр silent
- Устранена дублирующаяся инициализация BannerDataCollector в MainMenu (оптимизация)
- Исправлена потенциальная утечка памяти: register_shutdown_function защищён static флагом
