# Drawing Chat

방마다 성격을 고르는 **Next.js 기반 대화방 챗봇 프로토타입**입니다.

기존 파일 하나짜리 HTML 챗봇에서 Next.js + TypeScript 구조로 이식했습니다.

## 현재 기능

- Next.js App Router 구조
- TypeScript 기반 상태 관리
- Floating Island UI 디자인
- 이전 채팅 사이드바
- 새 채팅 생성
- 채팅방 삭제
- 현재 대화 초기화
- 채팅방별 타입 선택
  - ☁️ 말랑 대화
  - 💻 코딩 도움
  - 📚 공부 모드
  - 💡 아이디어
  - ⚡ 짧은 답변
- 타입별 응답 톤 변경
- localStorage 기반 대화 저장
- 입력 중 점 애니메이션
- 메시지 시간 표시
- 봇 아바타 제거
- 모바일 사이드바 지원

## 실행 방법

```bash
npm install
npm run dev
```

Codespaces에서는 실행 후 포트가 열리면 브라우저에서 확인하면 됩니다.

## 프로젝트 구조

```text
app/
  globals.css
  layout.tsx
  page.tsx
next.config.mjs
package.json
tsconfig.json
```

## 다음 개발 후보

- 실제 AI API 연결
- 채팅방 이름 직접 수정
- 다크 모드
- 메시지 복사 버튼
- 타입별 컬러 테마
- Supabase 로그인/저장
- Vercel 배포
