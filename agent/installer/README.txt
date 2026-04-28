========================================
  Tellustech SNMP Agent — 설치 가이드
========================================

제공되는 ZIP 파일에 포함된 항목:
  - tellustech-agent.exe   에이전트 실행 파일
  - config.json            계약·장비 정보 + 토큰
  - install.bat            설치 스크립트
  - uninstall.bat          제거 스크립트
  - README.txt             이 문서

[1] 설치 절차

  1. ZIP 파일을 임의 폴더에 압축 해제
  2. install.bat 더블클릭
  3. 권한 요청 시 「예」 클릭
  4. 자동으로 네트워크를 스캔합니다 (수십 초~1분)
  5. 발견된 프린터 목록이 표시됩니다
  6. 우리 장비 번호를 콤마로 입력 (예: 1,2 / 전체이면 all)
  7. ERP 등록이 완료되면 자동 닫힘
  8. 매월 [수집일]에 자동 수집 → ERP 전송 (백그라운드)

[2] 보안 안내

  install.bat 실행 직후, ZIP 폴더의 config.json 은 자동 삭제됩니다.
  설치된 토큰은 C:\Tellustech\config.json 에 보관되며,
  Windows 사용자 권한으로만 접근 가능합니다.

  토큰 분실 또는 PC 변경 시 관리자에게 새 ZIP 패키지를 요청하세요.

[3] 프린터 검색이 안 될 때

  원인:
    - 프린터 SNMP 설정 (UDP 161) 비활성화
    - 방화벽에서 SNMP 차단
    - 프린터 IP 가 다른 서브넷에 있음

  해결:
    - 프린터 웹 설정 페이지에서 SNMP v1/v2c 활성화 (community: public)
    - 방화벽에서 UDP 161 허용
    - 그래도 안 되면 setup 화면에서 「수동 IP 입력 모드」 사용

[4] 정상 작동 확인

  명령 프롬프트:
    "C:\Tellustech\tellustech-agent.exe" --status

  기대 출력:
    계약: TLS-XXXXXX-XXX | 고객: ...
    등록 장비: N대 | 수집일: 매월 25일
    미전송 큐: 0건
    최근 로그: ...

[5] 즉시 1회 수집 (디버그)

  "C:\Tellustech\tellustech-agent.exe" --collect

[6] 자동 업데이트

  매일 12:00 에이전트가 ERP 에 새 버전을 확인합니다.
  새 버전 다운로드 후 PC 재부팅 시 자동 적용 (install.bat 가 .pending 파일을 본 파일로 교체).

[7] 제거

  C:\Tellustech\uninstall.bat 실행 → 부팅 등록 + 폴더 모두 제거.

[8] 문의

  Tellustech 영업담당 또는 IT 담당자에게 연락하세요.
