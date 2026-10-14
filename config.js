// 클럽 설정 파일 — 값을 채우면 사이트에 자동 반영되고, 비워 두면 해당 요소가 깔끔하게 숨겨집니다.
window.CLUB_CONFIG = {
  // 카카오톡 오픈채팅 링크 (예: "https://open.kakao.com/o/abcdefg")
  // 비어 있으면 문의 버튼 자리에 "오픈채팅 링크 준비 중"이 표시됩니다.
  openChatUrl: "",

  // 전화번호 (예: "010-1234-5678"), 비어 있으면 숨김
  phone: "",

  // SNS 주소, 비어 있으면 숨김
  instagramUrl: "",
  bandUrl: "",

  // 클럽 기본 수치 (필요 시 수정 가능)
  stats: {
    years: 20,
    members: 22,
    weeklySessions: 2
  },

  // 회비 정보 (필요 시 수정 가능)
  fees: {
    joinFee: "50,000",
    monthlyFee: "40,000",
    guestNote: "게스트 참여 비용 및 가능 여부는 오픈채팅으로 편하게 문의해 주세요."
  },

  // 실제 회원 후기만 넣을 것. 비어 있으면 후기 섹션 전체가 숨겨집니다.
  // 예: { text: "화요일 저녁이 기다려집니다.", name: "김OO · 구력 8년" },
  reviews: [],
};
