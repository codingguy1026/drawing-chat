"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type RoomTypeKey = "soft" | "coding" | "study" | "idea" | "concise";
type Sender = "user" | "bot";

type Message = {
  id: string;
  sender: Sender;
  text: string;
  time: string;
  isTyping?: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  type: RoomTypeKey | null;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

type ConfirmState =
  | { kind: "clear" }
  | { kind: "delete"; sessionId: string }
  | null;

const BOT_NAME = "Drawing Chat";
const SESSIONS_STORAGE_KEY = "drawing_chat_sessions_v2";
const CURRENT_SESSION_KEY = "drawing_chat_current_session_v2";

const roomTypes: Record<RoomTypeKey, { label: string; emoji: string; description: string; tone: string }> = {
  soft: {
    label: "말랑 대화",
    emoji: "☁️",
    description: "생각 정리, 기분 기록, 가벼운 수다용 방",
    tone: "부드럽게 받아주는 모드",
  },
  coding: {
    label: "코딩 도움",
    emoji: "💻",
    description: "오류, 구조, 기능 아이디어를 빠르게 정리",
    tone: "개발 작업실 모드",
  },
  study: {
    label: "공부 모드",
    emoji: "📚",
    description: "개념 설명, 암기, 문제 풀이 흐름 잡기",
    tone: "선생님 옆자리 모드",
  },
  idea: {
    label: "아이디어",
    emoji: "💡",
    description: "기획, 세계관, UI, 이름 후보를 왕창 뽑기",
    tone: "브레인스토밍 모드",
  },
  concise: {
    label: "짧은 답변",
    emoji: "⚡",
    description: "군더더기 없이 핵심만 빠르게 보기",
    tone: "초고속 요약 모드",
  },
};

const quickPrompts = [
  "이 프로젝트 차별점 5개만 뽑아줘",
  "이 UI를 더 예쁘게 만드는 방향 알려줘",
  "오늘 할 일 3개로 정리해줘",
  "지금 코드 구조를 점검해줘",
];

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatTime = () =>
  new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

const createBlankSession = (): ChatSession => {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: "새 대화",
    type: null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
};

const getPreview = (session: ChatSession) => {
  const lastMessage = [...session.messages].reverse().find((message) => !message.isTyping);

  if (lastMessage) return lastMessage.text;
  if (session.type) return `${roomTypes[session.type].emoji} ${roomTypes[session.type].tone}`;
  return "아직 메시지가 없어요";
};

const getVisibleTitle = (session: ChatSession) => {
  if (session.messages.length > 0) return session.title;
  if (session.type) {
    const type = roomTypes[session.type];
    return `${type.emoji} ${type.label}`;
  }
  return "새 대화";
};

const createRoomReply = (input: string, type: RoomTypeKey | null) => {
  const normalized = input.toLowerCase();

  if (normalized.includes("안녕")) {
    return "안녕! 여기는 방마다 성격이 있는 작은 대화 작업실이야. 오늘은 어떤 방으로 굴려볼까?";
  }

  if (normalized.includes("오류") || normalized.includes("버그") || normalized.includes("에러")) {
    return "일단 증상, 재현 방법, 콘솔 로그 3개로 쪼개보자. 버그는 덩어리로 보면 괴물인데, 조각내면 그냥 퍼즐이야.";
  }

  if (normalized.includes("디자인") || normalized.includes("ui")) {
    return "디자인은 지금부터 확 달라질 수 있어. 핵심은 배경, 여백, 카드 계층, 버튼 반응감이야. 특히 이 앱은 '방을 고르는 순간'을 멋지게 보여주면 차별점이 살아나.";
  }

  if (normalized.includes("공부")) {
    return "공부는 먼저 목표를 작게 잘라야 해. 개념 이해, 예시 1개, 직접 설명하기 순서로 가면 머리에 더 오래 붙어.";
  }

  switch (type) {
    case "soft":
      return "좋아. 일단 천천히 풀어보자. 지금 말한 걸 보면 핵심 감정이나 고민이 하나 숨어 있는 것 같아.";
    case "coding":
      return "개발 모드로 보면, 이건 기능 단위로 쪼개는 게 좋아. 상태, UI, 이벤트, 저장소 순서로 점검해보자.";
    case "study":
      return "공부 모드로 정리하면 핵심 개념 하나, 예시 하나, 확인 질문 하나로 나누면 이해가 쉬워져.";
    case "idea":
      return "아이디어 모드 발동. 지금 주제를 더 독특하게 만들려면 이름, 사용 장면, 첫 화면 경험부터 바꿔보자.";
    case "concise":
      return "핵심만 말하면, 지금은 기능보다 첫인상과 사용 흐름을 다듬을 타이밍이야.";
    default:
      return "좋아. 먼저 이 방의 타입을 고르면 답변 분위기도 거기에 맞춰볼게. 지금은 기본 대화 모드로 받아둘게.";
  }
};

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  useEffect(() => {
    const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const storedCurrentSessionId = localStorage.getItem(CURRENT_SESSION_KEY);

    if (storedSessions) {
      try {
        const parsed = JSON.parse(storedSessions) as ChatSession[];
        const cleanSessions = parsed.length > 0 ? parsed : [createBlankSession()];
        const usableCurrentId = cleanSessions.some((session) => session.id === storedCurrentSessionId)
          ? storedCurrentSessionId
          : cleanSessions[0].id;

        setSessions(cleanSessions);
        setCurrentSessionId(usableCurrentId);
        setIsReady(true);
        return;
      } catch {
        const fallbackSession = createBlankSession();
        setSessions([fallbackSession]);
        setCurrentSessionId(fallbackSession.id);
        setIsReady(true);
        return;
      }
    }

    const firstSession = createBlankSession();
    setSessions([firstSession]);
    setCurrentSessionId(firstSession.id);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
    }
  }, [sessions, currentSessionId, isReady]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId) ?? null,
    [sessions, currentSessionId],
  );

  const currentType = currentSession?.type ? roomTypes[currentSession.type] : null;
  const visibleMessages = currentSession?.messages ?? [];

  const updateSession = (sessionId: string, updater: (session: ChatSession) => ChatSession) => {
    setSessions((previous) => previous.map((session) => (session.id === sessionId ? updater(session) : session)));
  };

  const createNewChat = () => {
    const session = createBlankSession();
    setSessions((previous) => [session, ...previous]);
    setCurrentSessionId(session.id);
    setIsSidebarOpen(false);
  };

  const selectRoomType = (typeKey: RoomTypeKey) => {
    if (!currentSession) return;

    updateSession(currentSession.id, (session) => ({
      ...session,
      type: typeKey,
      title: session.messages.length === 0 ? roomTypes[typeKey].label : session.title,
      updatedAt: new Date().toISOString(),
    }));
  };

  const addQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const clearCurrentChat = () => {
    if (!currentSession) return;

    updateSession(currentSession.id, (session) => ({
      ...session,
      title: session.type ? roomTypes[session.type].label : "새 대화",
      messages: [],
      updatedAt: new Date().toISOString(),
    }));
    setConfirmState(null);
  };

  const deleteChat = (sessionId: string) => {
    setSessions((previous) => {
      const nextSessions = previous.filter((session) => session.id !== sessionId);

      if (nextSessions.length === 0) {
        const blankSession = createBlankSession();
        setCurrentSessionId(blankSession.id);
        return [blankSession];
      }

      if (sessionId === currentSessionId) {
        setCurrentSessionId(nextSessions[0].id);
      }

      return nextSessions;
    });

    setConfirmState(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentSession) return;

    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const sessionId = currentSession.id;
    const userMessage: Message = {
      id: createId(),
      sender: "user",
      text: trimmedInput,
      time: formatTime(),
    };
    const typingMessage: Message = {
      id: createId(),
      sender: "bot",
      text: "입력 중",
      time: "",
      isTyping: true,
    };
    const hasUserMessage = currentSession.messages.some((message) => message.sender === "user" && !message.isTyping);

    setInput("");

    updateSession(sessionId, (session) => ({
      ...session,
      title: hasUserMessage ? session.title : trimmedInput.slice(0, 18),
      messages: [...session.messages.filter((message) => !message.isTyping), userMessage, typingMessage],
      updatedAt: new Date().toISOString(),
    }));

    window.setTimeout(() => {
      const botMessage: Message = {
        id: createId(),
        sender: "bot",
        text: createRoomReply(trimmedInput, currentSession.type),
        time: formatTime(),
      };

      updateSession(sessionId, (session) => ({
        ...session,
        messages: [...session.messages.filter((message) => !message.isTyping), botMessage],
        updatedAt: new Date().toISOString(),
      }));
    }, 650);
  };

  if (!isReady || !currentSession) {
    return (
      <main className="loading-screen">
        <div className="loading-card">Drawing Chat 불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />
      <div className="background-grid" />

      <button className="mobile-menu" type="button" onClick={() => setIsSidebarOpen(true)} aria-label="채팅 목록 열기">
        ☰
      </button>

      <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-card">
          <div className="brand-mark">D</div>
          <div>
            <p className="eyebrow">ROOM BASED AI</p>
            <h1>{BOT_NAME}</h1>
          </div>
        </div>

        <button className="new-chat-button" type="button" onClick={createNewChat}>
          <span>＋</span>
          새 대화 만들기
        </button>

        <div className="session-list" aria-label="이전 채팅 목록">
          {sessions.map((session) => (
            <button
              className={`session-item ${session.id === currentSessionId ? "active" : ""}`}
              key={session.id}
              type="button"
              onClick={() => {
                setCurrentSessionId(session.id);
                setIsSidebarOpen(false);
              }}
            >
              <span className="session-content">
                <strong>{getVisibleTitle(session)}</strong>
                <small>{getPreview(session)}</small>
              </span>
              <span
                className="delete-session"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmState({ kind: "delete", sessionId: session.id });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.stopPropagation();
                    setConfirmState({ kind: "delete", sessionId: session.id });
                  }
                }}
                aria-label="채팅방 삭제"
              >
                ×
              </span>
            </button>
          ))}
        </div>
      </aside>

      {isSidebarOpen && <button className="sidebar-backdrop" type="button" onClick={() => setIsSidebarOpen(false)} aria-label="사이드바 닫기" />}

      <section className="chat-stage">
        <header className="top-panel">
          <div>
            <p className="eyebrow">CURRENT ROOM</p>
            <h2>{BOT_NAME}</h2>
          </div>
          <div className="top-actions">
            {currentType && <span className="mode-pill">{`${currentType.emoji} ${currentType.label}`}</span>}
            <button className="ghost-button" type="button" onClick={() => setConfirmState({ kind: "clear" })}>
              현재 대화 초기화
            </button>
          </div>
        </header>

        <section className="chat-panel">
          {visibleMessages.length === 0 ? (
            <div className="empty-state">
              {!currentType ? (
                <>
                  <p className="empty-kicker">먼저 방의 성격을 골라줘</p>
                  <h3>어떤 대화를 시작할까?</h3>
                  <p>방 타입을 고르면 답변 분위기와 첫 화면이 그 타입에 맞게 바뀌어.</p>
                  <div className="room-type-grid">
                    {(Object.keys(roomTypes) as RoomTypeKey[]).map((typeKey) => {
                      const type = roomTypes[typeKey];
                      return (
                        <button className="room-type-card" type="button" key={typeKey} onClick={() => selectRoomType(typeKey)}>
                          <span>{type.emoji}</span>
                          <strong>{type.label}</strong>
                          <small>{type.description}</small>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="selected-mode-icon">{currentType.emoji}</div>
                  <p className="empty-kicker">{currentType.tone}</p>
                  <h3>{currentType.label} 준비 완료</h3>
                  <p>아래 입력창에 첫 메시지를 보내면 이 방의 제목도 자동으로 정해져.</p>
                  <div className="quick-prompt-row">
                    {quickPrompts.map((prompt) => (
                      <button type="button" key={prompt} onClick={() => addQuickPrompt(prompt)}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="message-list">
              {visibleMessages.map((message) => (
                <article className={`message-row ${message.sender === "user" ? "from-user" : "from-bot"}`} key={message.id}>
                  <div className={`bubble ${message.isTyping ? "typing-bubble" : ""}`}>
                    {message.isTyping ? (
                      <span className="typing-dots" aria-label="입력 중">
                        <span />
                        <span />
                        <span />
                      </span>
                    ) : (
                      message.text
                    )}
                  </div>
                  {!message.isTyping && <time>{message.time}</time>}
                </article>
              ))}
            </div>
          )}
        </section>

        <form className="input-panel" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={currentType ? `${currentType.label} 방에 메시지 보내기...` : "먼저 방 타입을 골라도 되고, 바로 입력해도 돼"}
            autoComplete="off"
          />
          <button type="submit" aria-label="메시지 보내기">
            ↑
          </button>
        </form>
      </section>

      {confirmState && (
        <div className="modal-layer" role="dialog" aria-modal="true">
          <div className="modal-card">
            <p className="eyebrow">CONFIRM</p>
            <h3>{confirmState.kind === "clear" ? "현재 대화를 비울까?" : "이 채팅방을 삭제할까?"}</h3>
            <p>{confirmState.kind === "clear" ? "방 타입은 유지하고 메시지만 지워져." : "삭제하면 이 방의 메시지도 함께 사라져."}</p>
            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setConfirmState(null)}>
                취소
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => {
                  if (confirmState.kind === "clear") clearCurrentChat();
                  if (confirmState.kind === "delete") deleteChat(confirmState.sessionId);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
