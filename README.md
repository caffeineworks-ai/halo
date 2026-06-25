# halo

> 빛으로 공간의 경계를 만드는 감성 오브제 — Nordic Mood  
> **Team Gyeongnam** / KDM+ 2026

<img src="images/halo-showroom.png" width="720">

---

## MCP 커넥터 연결

Claude에서 halo를 제어하려면 아래 MCP 서버를 먼저 연결하세요.

**MCP URL**
```
https://halo.typica-918.workers.dev/mcp
```

Claude.ai → 설정 → 커넥터 → URL로 추가

연결 후 Claude에게 이렇게 말해보세요:
- `"halo 켜줘"`
- `"밝기 80%로 올려줘"`
- `"halo 지금 뭐해?"`

---

## 가상기기 쇼룸

MCP와 연동되는 실시간 가상기기 쇼룸입니다.  
폴링 시작 버튼을 누르면 Claude의 명령이 즉시 반영됩니다.

**👉 [halo 가상기기 쇼룸 열기](https://caffeineworks-ai.github.io/halo/halo.html)**

---

## MCP 툴 목록

| 툴 | 설명 |
|----|------|
| `get_product_info` | 제품 정보 조회 |
| `get_lamp_state` | 전원·밝기·배터리·충전상태·누적켜진시간 조회 |
| `get_charging_state` | 충전중/방전중 + 배터리% 조회 |
| `set_power` | 전원 ON/OFF |
| `set_brightness` | 밝기 0~100 설정 |
| `get_last_message` | halo의 마지막 발화 메시지 조회 |
| `save_message` | halo 페르소나 발화를 저장 |

---

## 학생 과제 — 이 레포를 포크해서 완성하세요

### 1단계 — MCP 커넥터 연결
위의 MCP URL을 Claude에 연결합니다.

### 2단계 — 레포 포크
이 레포를 본인 GitHub 계정으로 포크한 뒤, GitHub Pages를 활성화하세요.  
Settings → Pages → Source: `main` / `/ (root)`

### 3단계 — index.html 수정
`index.html`은 halo의 브랜드 랜딩페이지입니다.  
스티치 결과물을 참고해서 팀의 디자인으로 자유롭게 완성하세요.

### 4단계 — halo.html 스타일 수정
`halo.html`은 MCP와 연동되는 가상기기 쇼룸입니다.  
레이아웃과 기능은 유지하되, 색상·폰트·SVG 등 비주얼을 팀 스타일에 맞게 수정하세요.

> MCP 연동 로직(`syncWithMcp`, `pushStateToServer`)과 배터리 시뮬레이터는 수정하지 마세요.

---

## 파일 구조

```
halo/
├── index.html        ← 브랜드 랜딩페이지 (3단계)
├── halo.html         ← 가상기기 쇼룸 (4단계)
├── images/
│   └── halo-showroom.png
└── src/
    └── index.ts      ← MCP 서버 (수정 불필요)
```

---

**Team Gyeongnam** · KDM+ 2026
