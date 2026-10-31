// 모바일 테스트 모드. PC에서는 버튼으로 가로 폰 크기 화면 + 터치 UI를 켜고, 실제 터치 기기는 자동으로 켠다.
export function setupMobileMode() {
  const body = document.body, btn = document.getElementById("mobile-btn")!;
  const realTouch = matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 0;

  const apply = (on: boolean) => {
    body.classList.toggle("mobile", on);
    body.classList.toggle("sim", on && !realTouch);
    btn.textContent = on ? "🖥 PC 화면으로" : "📱 모바일 테스트";
    btn.blur();
  };
  btn.addEventListener("click", () => apply(!body.classList.contains("mobile")));
  apply(realTouch);

  // 터치 스크롤과 더블탭 확대를 막는다
  document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
}
