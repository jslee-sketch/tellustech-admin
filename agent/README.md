# Tellustech SNMP Agent

Windows 에이전트 — 고객사 PC 에 설치되어 SNMP 카운터를 자동 수집하고 ERP 로 전송.

## 빌드

```cmd
cd agent
build.cmd
```

결과: `build/tellustech-agent.exe` (단일 실행 파일, Node.js 미설치 환경에서도 동작).

## 배포 패키지 만들기

1. ERP 관리자 페이지 → SNMP 관리 → 장비 토큰 → [에이전트 패키지 다운로드] 로 `config-{contractCode}.json` 다운로드
2. 다음 4개 파일을 ZIP 으로 묶기:
   - `tellustech-agent.exe` (build 결과물)
   - `config-{contractCode}.json` → `config.json` 으로 이름 변경
   - `installer/install.bat`
   - `installer/uninstall.bat`
   - `installer/README.txt`
3. ZIP 을 USB 에 복사 → 고객사 PC 에서 install.bat 실행

## 명령줄 옵션

| 옵션 | 동작 |
|---|---|
| `--setup` | 첫 실행 — 네트워크 스캔 + 사용자 선택 + ERP 등록 (기본) |
| `--silent` | 백그라운드 — cron 스케줄러 실행 (PC 부팅 시 자동) |
| `--collect` | 즉시 1회 수집 (디버그) |
| `--status` | 최근 로그 + pending 큐 출력 |

## 자동 수집 흐름

매일 00:00 → snmpCollectDay 와 일치하면 폴링 → ERP 전송. 실패 시 매시간 재시도, 5회 후 포기 + heartbeat 에러 보고.

## 자동 업데이트

매일 12:00 → ERP `/api/snmp/agent-version` 호출. 새 버전 있으면 다운로드 → `.pending` 파일로 저장. 다음 PC 재부팅 또는 `install.bat` 재실행 시 자동 교체.

## 보안

- `config.json` 의 토큰은 Windows 사용자 권한으로만 접근 가능 (`C:\Tellustech`).
- ZIP 의 `config.json` 은 install.bat 끝에서 자동 삭제 (USB 분실 시 토큰 노출 방지).
- 60일 미접속 시 ERP 측에서 토큰 자동 만료. 관리자가 [폐기] 버튼으로 즉시 무효화 가능.

## 의존성

- `net-snmp` ^3.18 — SNMP v1/v2c
- `better-sqlite3` ^11 — 로컬 큐 (전송 실패 보관)
- `node-cron` ^3 — 스케줄러
- `pkg` — 단일 exe 빌드
