import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  HALO_KV: KVNamespace;
}

interface LampState {
  power: boolean;
  battery: number;
  brightness: number;
  charging: boolean;
  uptimeMinutes: number; // 누적 켜진 시간 (분)
}

const DEFAULT_STATE: LampState = {
  power: true,
  battery: 80.0,
  brightness: 40,
  charging: false,
  uptimeMinutes: 0,
};

export class HaloMCP extends McpAgent {
  server = new McpServer({ name: "halo", version: "1.0.0" });

  async init() {
    const getState = async (): Promise<LampState> => {
      const raw = await (this.env as Env).HALO_KV.get("state");
      return raw ? JSON.parse(raw) : { ...DEFAULT_STATE };
    };

    const saveState = async (state: LampState) => {
      await (this.env as Env).HALO_KV.put("state", JSON.stringify(state));
    };

    const getLastMessage = async (): Promise<string | null> => {
      return await (this.env as Env).HALO_KV.get("last_message");
    };

    const saveLastMessage = async (message: string) => {
      await (this.env as Env).HALO_KV.put("last_message", message);
    };

    // ── 제품 소개 ──────────────────────────────────────────────
    this.server.tool(
      "get_product_info",
      "halo 조명의 제품명·제조번호·인증번호·제조사·고객센터 등 기본 정보를 반환합니다. 사용자가 제품에 대해 물어볼 때 호출하세요.",
      {},
      async () => {
        return {
          content: [
            {
              type: "text",
              text: `🌙 halo — 빛으로 공간의 경계를 만드는 감성 오브제

【제품 컨셉】
Nordic Mood를 담은 감성 오브제 조명입니다.
고정 색온도 2700K의 따뜻한 빛으로 공간에 경계와 분위기를 만들며,
halo 스스로 자신의 상태를 표현합니다.

【제품 정보】
• 제품명: halo
• 타입: TYPE 01 / 02 / 03
• 출시년도: 2026
• 제조사: Team Gyeongnam (KDM+)
• 제조번호: HLO-2026-KDM
• 인증번호: KDM-26-001
• 고객센터: kdm.team.gyeongnam@example.com

【주요 기능】
• 전원 ON/OFF
• 밝기 조절 (0~100%)
• 색온도: 고정 2700K (변경 불가)
• 배터리 잔량 및 충전 상태 모니터링
• 누적 켜진 시간 추적
• halo 자체 상태 메시지 발화

【자연어 명령 예시】
"켜줘." → 전원 ON
"꺼줘." → 전원 OFF
"밝게 해줘." → 밝기 80%
"halo 지금 뭐해?" → 현재 상태 + 마지막 발화 조회`,
            },
          ],
        };
      }
    );

    // ── 상태 조회 ──────────────────────────────────────────────
    this.server.tool(
      "get_lamp_state",
      "halo 조명의 현재 상태(전원·밝기·배터리·충전상태·누적켜진시간)를 조회합니다.",
      {},
      async () => {
        const state = await getState();
        const uptimeHours = Math.floor(state.uptimeMinutes / 60);
        const uptimeMins = state.uptimeMinutes % 60;
        return {
          content: [
            {
              type: "text",
              text: `🌙 halo 현재 상태
• 전원: ${state.power ? "ON ✅" : "OFF ❌"}
• 배터리: ${state.battery.toFixed(1)}%${state.battery <= 20 ? " ⚠️ 배터리 부족" : ""}
• 충전 상태: ${state.charging ? "충전중 ⚡" : "방전중"}
• 밝기: ${state.brightness}%
• 색온도: 2700K (고정)
• 누적 켜진 시간: ${uptimeHours}시간 ${uptimeMins}분`,
            },
          ],
        };
      }
    );

    // ── 충전 상태 조회 ────────────────────────────────────────
    this.server.tool(
      "get_charging_state",
      "halo의 현재 충전 상태(충전중/방전중)와 배터리 잔량을 조회합니다.",
      {},
      async () => {
        const state = await getState();
        return {
          content: [
            {
              type: "text",
              text: `🔋 halo 충전 상태
• 배터리 잔량: ${state.battery.toFixed(1)}%
• 충전 상태: ${state.charging ? "충전중 ⚡" : "방전중"}
${state.battery <= 20 && !state.charging ? "⚠️ 배터리가 부족합니다. 충전을 연결해주세요." : ""}
${state.battery === 100 ? "✅ 완충 상태입니다." : ""}`,
            },
          ],
        };
      }
    );

    // ── 전원 ──────────────────────────────────────────────────
    this.server.tool(
      "set_power",
      "halo 조명의 전원을 켜거나 끕니다.",
      { on: z.boolean().describe("true = 전원 ON, false = 전원 OFF") },
      async ({ on }) => {
        const state = await getState();
        state.power = on;

        // 전원을 끄면 누적 켜진 시간 초기화 안 함 (누적 유지)
        await saveState(state);

        // 전원 OFF 시 halo 발화 저장
        if (!on) {
          await saveLastMessage("저 켜주세요, 심심해요.");
        }

        return {
          content: [
            {
              type: "text",
              text: on
                ? "🌙 halo 전원을 켰습니다."
                : "🌑 halo 전원을 껐습니다.",
            },
          ],
        };
      }
    );

    // ── 밝기 ──────────────────────────────────────────────────
    this.server.tool(
      "set_brightness",
      "halo 조명의 밝기를 설정합니다. 0(소등)~100(최대) 사이의 값을 지정하세요.",
      {
        brightness: z
          .number()
          .int()
          .min(0)
          .max(100)
          .describe("밝기 값 (0~100)"),
      },
      async ({ brightness }) => {
        const state = await getState();
        state.brightness = brightness;
        await saveState(state);
        return {
          content: [
            {
              type: "text",
              text: `💡 halo 밝기를 ${brightness}%로 설정했습니다.`,
            },
          ],
        };
      }
    );

    // ── 충전 상태 설정 ───────────────────────────────────────
    this.server.tool(
      "set_charging",
      "halo의 충전 상태를 설정합니다. true = 충전중, false = 방전중.",
      { charging: z.boolean().describe("true = 충전중, false = 방전중") },
      async ({ charging }) => {
        const state = await getState();
        state.charging = charging;
        await saveState(state);
        return {
          content: [
            {
              type: "text",
              text: charging
                ? "⚡ halo 충전을 시작했습니다."
                : "🔋 halo 충전을 중단했습니다.",
            },
          ],
        };
      }
    );

    // ── 마지막 발화 조회 ──────────────────────────────────────
    this.server.tool(
      "get_last_message",
      "KV에 저장된 halo의 마지막 발화 메시지를 조회합니다. 'halo 지금 뭐해?' 같은 질문에 get_lamp_state와 함께 호출하세요.",
      {},
      async () => {
        const message = await getLastMessage();
        return {
          content: [
            {
              type: "text",
              text: message
                ? `💬 halo의 마지막 메시지: "${message}"`
                : "💬 halo가 아직 아무 말도 하지 않았어요.",
            },
          ],
        };
      }
    );

    // ── 발화 저장 ─────────────────────────────────────────────
    this.server.tool(
      "save_message",
      "Claude가 halo의 상태를 판단한 뒤 halo 페르소나의 발화를 KV에 저장합니다. 상태 변화(배터리 부족, 오래 켜짐, 충전 완료 등)를 감지했을 때 호출하세요.",
      {
        message: z.string().describe("halo가 할 말 (halo 페르소나로 작성된 짧은 문장)"),
      },
      async ({ message }) => {
        await saveLastMessage(message);
        return {
          content: [
            {
              type: "text",
              text: `✅ halo 메시지 저장 완료: "${message}"`,
            },
          ],
        };
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // MCP 엔드포인트
    if (url.pathname === "/mcp") {
      return HaloMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // 상태 조회 REST 엔드포인트 (halo.html 폴링용)
    if (url.pathname === "/state" && request.method === "GET") {
      return env.HALO_KV.get("state").then(
        (val) =>
          new Response(val ?? JSON.stringify({
            power: true,
            battery: 80.0,
            brightness: 40,
            charging: false,
            uptimeMinutes: 0,
          }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          })
      );
    }

    // 상태 저장 REST 엔드포인트 (halo.html UI 조작 시 즉시 반영)
    if (url.pathname === "/state" && request.method === "POST") {
      return request.json().then(async (body: unknown) => {
        await env.HALO_KV.put("state", JSON.stringify(body));
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      });
    }

    // 마지막 발화 조회 REST 엔드포인트 (halo.html 폴링용)
    if (url.pathname === "/last-message" && request.method === "GET") {
      return env.HALO_KV.get("last_message").then(
        (val) =>
          new Response(JSON.stringify({ message: val ?? null }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          })
      );
    }

    // 마지막 발화 저장 REST 엔드포인트 (halo.html 시나리오 트리거용)
    if (url.pathname === "/last-message" && request.method === "POST") {
      return request.json().then(async (body: any) => {
        await env.HALO_KV.put("last_message", body.message ?? "");
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
