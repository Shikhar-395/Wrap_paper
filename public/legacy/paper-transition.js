(() => {
  const PAGE_COUNT = 3;
  const DURATION = 1150;
  const COOLDOWN = 600;
  const DEADZONE = 8;

  const easeInOut = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  let page = 0;
  let busy = false;
  let lastTurn = 0;
  let touchStartY = null;
  let touchStartX = null;

  const ensureIndicator = () => {
    let indicator = document.querySelector(".paper-page-indicator");
    if (indicator) return indicator;

    indicator = document.createElement("div");
    indicator.className = "paper-page-indicator";
    indicator.setAttribute("aria-label", "Current newspaper page");
    indicator.setAttribute("aria-live", "polite");

    for (let index = 0; index < PAGE_COUNT; index += 1) {
      const item = document.createElement("span");
      item.textContent = String(index + 1);
      item.dataset.page = String(index);
      indicator.appendChild(item);
    }

    document.body.appendChild(indicator);
    return indicator;
  };

  const updateIndicator = () => {
    const indicator = ensureIndicator();
    indicator.querySelectorAll("span").forEach((item, index) => {
      item.toggleAttribute("data-active", index === page);
    });
  };

  const getControls = () => window.__paperWrapControls;
  const getCanvas = () => document.querySelector(".cr-canvas");

  const setCanvasPose = (canvas, y, scale, opacity, rotate = 0) => {
    canvas.style.transform = `translate3d(0, ${y}vh, 0) scale(${scale}) rotate(${rotate}deg)`;
    canvas.style.opacity = String(opacity);
  };

  const resetCanvasPose = (canvas) => {
    canvas.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
    canvas.style.opacity = "1";
  };

  const waitForPaper = (callback) => {
    const tick = () => {
      const controls = getControls();
      const canvas = getCanvas();
      if (controls && canvas) callback(controls, canvas);
      else requestAnimationFrame(tick);
    };
    tick();
  };

  const turnPage = (direction) => {
    const controls = getControls();
    const canvas = getCanvas();
    if (!controls || !canvas) return;

    const now = performance.now();
    if (busy || now - lastTurn < COOLDOWN) return;

    const nextPage = Math.max(0, Math.min(PAGE_COUNT - 1, page + direction));
    if (nextPage === page) return;

    busy = true;
    lastTurn = now;

    const from = page;
    const to = nextPage;
    page = nextPage;
    updateIndicator();
    const exitY = direction > 0 ? -72 : 72;
    const enterY = direction > 0 ? 72 : -72;
    const spin = direction > 0 ? -9 : 9;
    const started = performance.now();

    document.documentElement.dataset.paperTurning = "true";
    canvas.style.willChange = "transform, opacity";

    const frame = (time) => {
      const raw = Math.min(1, (time - started) / DURATION);
      const foldPoint = from + (to - from) * 0.52;

      if (raw < 0.42) {
        const q = easeInOut(raw / 0.42);
        controls.hold(from + (foldPoint - from) * q);
        setCanvasPose(canvas, exitY * 0.08 * q, 1 - 0.18 * q, 1, spin * 0.25 * q);
      } else if (raw < 0.64) {
        const q = easeInOut((raw - 0.42) / 0.22);
        controls.hold(foldPoint);
        setCanvasPose(canvas, exitY * q, 0.82 - 0.34 * q, 1 - q, spin * (0.25 + 0.75 * q));
      } else if (raw < 0.68) {
        controls.hold(foldPoint);
        setCanvasPose(canvas, enterY, 0.48, 0, -spin);
      } else {
        const q = easeInOut((raw - 0.68) / 0.32);
        controls.hold(foldPoint + (to - foldPoint) * q);
        setCanvasPose(canvas, enterY * (1 - q), 0.48 + 0.52 * q, q, -spin * (1 - q));
      }

      if (raw < 1) {
        requestAnimationFrame(frame);
      } else {
        controls.hold(to);
        controls.release();
        resetCanvasPose(canvas);
        canvas.style.willChange = "auto";
        delete document.documentElement.dataset.paperTurning;
        lastTurn = performance.now();
        busy = false;
      }
    };

    requestAnimationFrame(frame);
  };

  const onWheel = (event) => {
    if (Math.abs(event.deltaY) <= DEADZONE) return;
    event.preventDefault();
    turnPage(event.deltaY > 0 ? 1 : -1);
  };

  const onKeyDown = (event) => {
    if (["ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      turnPage(1);
    }
    if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      turnPage(-1);
    }
  };

  const onTouchStart = (event) => {
    const touch = event.touches[0];
    touchStartY = touch.clientY;
    touchStartX = touch.clientX;
  };

  const onTouchMove = (event) => {
    if (touchStartY !== null) event.preventDefault();
  };

  const onTouchEnd = (event) => {
    if (touchStartY === null) return;
    const touch = event.changedTouches[0];
    const dy = touchStartY - touch.clientY;
    const dx = touchStartX - touch.clientX;
    touchStartY = null;
    touchStartX = null;
    if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      turnPage(dy > 0 ? 1 : -1);
    }
  };

  waitForPaper((controls, canvas) => {
    controls.hold(0);
    controls.release();
    resetCanvasPose(canvas);
    updateIndicator();
    document.documentElement.dataset.paperMode = "paged";

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    window.__newspaperPager = {
      next: () => turnPage(1),
      prev: () => turnPage(-1),
      get page() {
        return page;
      },
    };
  });
})();
