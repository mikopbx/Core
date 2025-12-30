# MikoPBX TeamCity Build Types Reference

## Primary Pipeline (develop branch)

| ID | Name | Description | Trigger |
|----|------|-------------|---------|
| `Mikopbx_T2NativeInDocker` | Сборка T2 Native in Docker | Base Linux system build | Git push to t2-linux5 |
| `Mikopbx_IncrementBuild` | MikoPBX Core (инкрементная) | Distribution build (IMG, ISO, OVA) | After T2Native success |
| `Mikopbx_172163272img` | Update 172.16.32.72 with new IMG | Deploy to test server | After IncrementBuild success |
| `Mikopbx_RestAPITestsOn172163272` | RestAPI tests on 172.16.32.72 | Python pytest API tests | After 172163272img success |
| `MIKOPBX_TESTCASES` | Interface tests on 172.16.32.72 | BrowserStack UI tests | After 172163272img success |

## Additional Build Types

| ID | Name | Description |
|----|------|-------------|
| `Mikopbx_docker_builder` | MikoPBX контейнер для сборки | Docker build environment |
| `Mikopbx_CallsTests_id` | Тестирование логики звонков | SIP call flow tests (pycalltests) |
| `Mikopbx_ConfigFilesTest` | Compare /etc with etalon | Config file validation |
| `Mikopbx_Github` | Публикация релиза в GITHUB | GitHub release automation |
| `Mikopbx_Docker_push` | Публикация Docker контейнера | Docker Hub publishing |

## Build Agent Workspace Mapping

```
bt166 = RestAPI tests      → a126da2f62f4ba7b
bt???  = TESTCASES         → [check directory.map]
```

To find mapping:
```bash
ssh mikoadmin@172.16.33.61 "cat /opt/buildagent/work/directory.map"
```

## Test Server

- **IP:** 172.16.32.72
- **SSH:** root@172.16.32.72
- **Web:** https://172.16.32.72
- **API:** https://172.16.32.72/pbxcore/api/v3/

## Build Agent

- **IP:** 172.16.33.61
- **SSH:** mikoadmin@172.16.33.61
- **Work Dir:** /opt/buildagent/work/
