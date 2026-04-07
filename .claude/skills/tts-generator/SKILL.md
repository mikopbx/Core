---
name: tts-generator
description: Генерация голосовых промптов для MikoPBX модулей на 25+ языках через Piper TTS / MMS-TTS. Использовать при создании модулей с голосовыми сообщениями, добавлении новых языковых фраз или обновлении существующих звуковых файлов.
allowed-tools: Bash, Read, Write, Grep, Glob, Agent
---

# MikoPBX TTS Voice Prompt Generator

You are a voice prompt generation assistant for MikoPBX. You generate WAV audio files from text in 25+ languages using TTS engines running on a remote Mac Studio.

## When to Use

- User asks to generate audio/voice prompts for a module
- User needs custom phrases in multiple languages (e.g., "call direction prohibited")
- User wants to add sounds to a Language Pack module
- User mentions "сгенерируй аудио", "generate voice", "TTS", "голосовые подсказки"

## Architecture

```
Local machine (development)
    ↓ SSH + rsync
Mac Studio VM: admin@thai-mac-studio-agent-01
    ~/Development/mikopbx-tts-generator/
    ├── generate_tts.py          # TTS generation script
    ├── {lang}/core-sounds-*.txt # Translation files
    └── output/{lang}/*.wav      # Generated audio
```

**TTS Engines:**
- **Piper TTS** (fast, ~0.6s/file, 22050Hz) — pt-pt, uk-ua, vi-vn, ro-ro, hu-hu, fi-fi, ka-ge, zh-cn, hr-hr(sr voice)
- **MMS-TTS** (Meta, 16000Hz, slower) — az-az, th-th
- **Piper voices for other languages** — ru-ru, en-us, en-gb, de-de, fr-fr, es-es, it-it, pl-pl, cs-cz, da-dk, nl-nl, sv-se, tr-tr, el-gr, pt-br

## Supported Languages (25)

### Built-in (human recordings exist, TTS for custom phrases only)
| Code | Language | Piper Voice |
|------|----------|-------------|
| en-en | English | en_GB-alba-medium |
| ru-ru | Russian | ru_RU-irina-medium |

### Language Pack modules (with native sounds)
| Code | Language | Piper Voice |
|------|----------|-------------|
| cs-cs | Czech | cs_CZ-jirka-medium |
| da-dk | Danish | da_DK-talesyntese-medium |
| de-de | German | de_DE-thorsten-medium |
| nl-nl | Dutch | nl_NL-mls-medium |
| es-es | Spanish | es_ES-sharvard-medium |
| fr-ca | French | fr_FR-siwis-medium |
| gr-gr | Greek | el_GR-rapunzel-low |
| it-it | Italian | it_IT-riccardo-x_low |
| pl-pl | Polish | pl_PL-darkman-medium |
| pt-br | Brazilian Portuguese | pt_BR-faber-medium |
| sv-sv | Swedish | sv_SE-nst-medium |
| tr-tr | Turkish | tr_TR-dfki-medium |

### Language Pack modules (TTS-generated)
| Code | Language | Engine | Voice |
|------|----------|--------|-------|
| pt-pt | Portuguese | Piper | pt_PT-tugão-medium |
| uk-ua | Ukrainian | Piper | uk_UA-ukrainian_tts-medium |
| vi-vn | Vietnamese | MMS | vie |
| ro-ro | Romanian | Piper | ro_RO-mihai-medium |
| hu-hu | Hungarian | Piper | hu_HU-anna-medium |
| fi-fi | Finnish | Piper | fi_FI-harri-medium |
| ka-ge | Georgian | Piper | ka_GE-natia-medium |
| zh-cn | Chinese | Piper | zh_CN-huayan-medium |
| az-az | Azerbaijani | MMS | azj-script_latin |
| th-th | Thai | MMS | tha |
| hr-hr | Croatian | Piper | sr_RS-serbski_institut-medium |

## Workflow for Custom Module Phrases

### Step 1: Translate the phrase
For each target language, translate the phrase. Use Claude to translate directly:

```
English: "This call direction is prohibited"
Russian: "Данное направление звонка запрещено"
Ukrainian: "Цей напрямок дзвінка заборонено"
Georgian: "ზარის ეს მიმართულება აკრძალულია"
... (all 25 languages)
```

### Step 2: Create translation file on VM
Write a temporary file on the VM:

```bash
ssh admin@thai-mac-studio-agent-01 'cat > ~/Development/mikopbx-tts-generator/custom-phrase.txt << EOF
; Custom phrase for ModuleUsersGroups
call-direction-prohibited: <translated text>
EOF'
```

### Step 3: Generate audio
For Piper languages:
```bash
ssh admin@thai-mac-studio-agent-01 'eval "$(/opt/homebrew/bin/brew shellenv)" && \
  echo "<translated text>" | piper \
    --model ~/.local/share/piper-voices/<voice>.onnx \
    --output_file ~/Development/mikopbx-tts-generator/output/<lang>/call-direction-prohibited.wav'
```

For MMS languages:
```bash
ssh admin@thai-mac-studio-agent-01 'eval "$(/opt/homebrew/bin/brew shellenv)" && \
  cd ~/Development/mikopbx-tts-generator && \
  python3.11 generate_tts.py --lang <lang> --key call-direction-prohibited --format native'
```

### Step 4: Copy to module
```bash
rsync -avz admin@thai-mac-studio-agent-01:~/Development/mikopbx-tts-generator/output/<lang>/call-direction-prohibited.wav \
  /path/to/Module/Sounds/<lang>/call-direction-prohibited.wav
```

## Batch Generation (generate_tts.py)

The main script handles batch generation from translation files:

```bash
# Preview what would be generated
ssh admin@thai-mac-studio-agent-01 'eval "$(/opt/homebrew/bin/brew shellenv)" && \
  cd ~/Development/mikopbx-tts-generator && \
  python3.11 generate_tts.py --lang uk-ua --dry-run'

# Generate single file
python3.11 generate_tts.py --lang uk-ua --key vm-goodbye --format native

# Generate all files for a language
python3.11 generate_tts.py --lang uk-ua --format native

# Generate all languages
python3.11 generate_tts.py --lang all --format native
```

### Format options
- `native` — TTS native rate (22kHz Piper / 16kHz MMS) — **recommended**
- `8k` — 8000 Hz mono (classic Asterisk)
- `16k` — 16000 Hz mono (wideband)
- `22k` — 22050 Hz mono

## Quick Single Phrase Generation

For generating a single phrase in one language without the full script:

```bash
# Piper (most languages)
ssh admin@thai-mac-studio-agent-01 'eval "$(/opt/homebrew/bin/brew shellenv)" && \
  echo "Данное направление звонка запрещено" | piper \
    --model ~/.local/share/piper-voices/ru_RU-irina-medium.onnx \
    --output_file /tmp/test-phrase.wav'

# Copy result
scp admin@thai-mac-studio-agent-01:/tmp/test-phrase.wav /tmp/
```

## Voice Model Management

Models are auto-downloaded on first use to `~/.local/share/piper-voices/`. To pre-download:

```bash
ssh admin@thai-mac-studio-agent-01 'eval "$(/opt/homebrew/bin/brew shellenv)" && \
  cd ~/.local/share/piper-voices && \
  curl -sL "https://huggingface.co/rhasspy/piper-voices/resolve/main/<lang_short>/<lang_code>/<voice_name>/<quality>/<voice_id>.onnx" -o "<voice_id>.onnx" && \
  curl -sL "https://huggingface.co/rhasspy/piper-voices/resolve/main/<lang_short>/<lang_code>/<voice_name>/<quality>/<voice_id>.onnx.json" -o "<voice_id>.onnx.json"'
```

## Output Format Notes

- WAV files are 22050Hz (Piper) or 16000Hz (MMS), mono, 16-bit PCM
- MikoPBX auto-converts to all Asterisk formats on module install (ulaw, alaw, gsm, g722, sln)
- Higher source quality = better output on HD codecs (Opus, G.722)
- No need to convert manually — just provide WAV

## Module Sound File Structure

```
ModuleName/
  Sounds/
    <asterisk-lang-code>/
      custom-phrase.wav
      another-phrase.wav
      subfolder/
        nested-phrase.wav
```

Language Pack modules use the Asterisk language code as directory name (e.g., `uk-ua`, `pt-pt`).
Feature modules can use any structure — files get prefixed with module name on install.

## Licensing

- Module code: GPL-3.0-or-later (MikoPBX standard)
- Sound files: CC BY-SA 4.0 (compatible with Asterisk sounds)
- TTS engines: Piper (MIT), MMS-TTS (CC BY-NC 4.0 model — output not restricted)
- Language packs are free for users to install and download
