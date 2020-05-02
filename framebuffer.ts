"strict";
const transitionTimeMs = 1000;
const transitionPauseTimeMs = 250;

const buffers: HTMLIFrameElement[] = [];

if (window === window.parent) {
  window.onload = rewritePageIntoHostPage;
}
// only run init if at the root
// otherwise do nothing

function rewritePageIntoHostPage() {
  const style = document.createElement("style");
  const body = document.createElement("body");

  const frameBuffer0Parent = document.createElement("div");
  const frameBuffer1Parent = document.createElement("div");

  const frameBuffer0 = document.createElement("iframe");
  const frameBuffer1 = document.createElement("iframe");

  buffers[0] = frameBuffer0;
  buffers[1] = frameBuffer1;

  frameBuffer0Parent.append(frameBuffer0);
  frameBuffer1Parent.append(frameBuffer1);

  frameBuffer0.className = "frameBuffer otherBuffer";
  frameBuffer1.className = "frameBuffer otherBuffer";

  frameBuffer0.id = "frameBuffer0";
  frameBuffer1.id = "frameBuffer1";

  frameBuffer0Parent.id = "frameBuffer0Parent";
  frameBuffer1Parent.id = "frameBuffer1Parent";

  body.append(frameBuffer0Parent, frameBuffer1Parent);

  style.innerHTML = `
  html,
  body,
  .frameBuffer {
    height: 100vh;
    width: 100vw;
    margin: 0;
    padding: 0;
    border: 0 none;
  }

  .frameBuffer {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    overflow: hidden;
  }

  .activeBuffer {
    opacity: 1;
    z-index: 0;
    clip-path: polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%);
  }

  .otherBuffer {
    opacity: 0;
    z-index: 1;
    clip-path: polygon(0% 2%, 6% 2%, 6% 0%, 10% 5%, 6% 1%, 6% 8%, 0% 8%);
    transition-property: opacity, clip-path;
    transition-duration: ${transitionTimeMs}ms;
  }  

  `;

  document.body = body;

  const currentScriptUrl = [
    ...document.head.getElementsByTagName("script")
  ].filter(v => v.src.endsWith("framebuffer.js"))[0].src;

  if (!currentScriptUrl) {
    throw new Error(
      "Expected script to be named framebuffer.js, but unable to find script tag for that name"
    );
  }

  // remove everything except the link to this script
  [...document.head.getElementsByTagName("script")]
    .filter(v => v.src !== currentScriptUrl)
    .forEach(v => v.remove());

  [...document.head.childNodes]
    .filter(v => v.nodeName.toLowerCase() !== "script")
    .forEach(v => v.remove());

  document.head.append(style);

  init();
}

function init() {
  window.onpopstate = function(this: WindowEventHandlers, ev: PopStateEvent) {
    loadNewBufferFromHistory(ev);
  };

  buffers.forEach(buffer =>
    buffer.addEventListener("load", () => onBufferLoadComplete(buffer))
  );

  function onBufferLoadComplete(buffer: HTMLIFrameElement) {
    const backgroundDocument = window.document;
    const framedDocument = buffer.contentWindow!.document;
    const origin = framedDocument.location.origin;
    document.title = framedDocument.title;

    if (framedDocument.documentElement.style.backgroundColor) {
      backgroundDocument.documentElement.style.backgroundColor = framedDocument.documentElement.style.backgroundColor;
    } else {
      framedDocument.documentElement.style.backgroundColor = "white";
    }

    Array.from(framedDocument.getElementsByTagName("a")).forEach(element => {
      const href = element.href;

      if (href && href.startsWith(origin)) {
        element.addEventListener("click", async function(e) {
          e.preventDefault();
          loadNewBufferFromUrl(href);

          return false;
        });
      } else if (!element.target) {
        element.target = "_parent";
      }
    });

    window.history.pushState(
      {
        html: framedDocument.documentElement.outerHTML,
        loadHtmlFromState: true
      },
      framedDocument.title,
      framedDocument.location.href
    );

    transition(buffer);
  }

  function doNewBufferAction(callback: (buffer: HTMLIFrameElement) => void) {
    const newBuffer = buffers.filter(
      buffer => !buffer.classList.contains("activeBuffer")
    )[0] || buffers[0];

    callback(newBuffer);
  }

  function loadNewBufferFromUrl(path: string) {
    doNewBufferAction(v => (v.src = path));
  }

  function loadNewBufferFromHistory(ev: PopStateEvent) {
    doNewBufferAction(buffer => {
      if (ev.state && ev.state.loadHtmlFromState) {
        buffer.innerHTML = ev.state.html;
        transition(buffer);
      }
    });
  }

  function transition(buffer: HTMLIFrameElement) {
    const otherBuffer = buffers.filter(v => v !== buffer)[0];

    // buffer.style.transitionDelay =
    //   transitionTimeMs + transitionPauseTimeMs + "ms";
    // otherBuffer.style.transitionDelay = "0ms";

    buffer.classList.add("activeBuffer", "front");
    buffer.classList.remove("activeBuffer", "back");
    otherBuffer.classList.add("back");
    // otherBuffer.classList.remove("activeBuffer");
  }

  loadNewBufferFromUrl(document.URL);
}
