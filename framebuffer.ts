function initFrameBuffer() {
  const fb = new frameBuffer();
  fb.initFrameBuffer();
}

if (window === window.parent) {
  // only modify page if root frame
  window.onload = initFrameBuffer;
}

enum framebufferCssClass {
  active = "framebuffer-active",
  passive = "framebuffer-passive",
  initial = "framebuffer-initial",
}

class frameBuffer {
  private buffers: [HTMLIFrameElement, HTMLIFrameElement] = [
    document.createElement("iframe"),
    document.createElement("iframe"),
  ];

  private buildFrameBufferParent(buffer: HTMLIFrameElement, id: string) {
    buffer.className = "frameBuffer";
    buffer.id = "frameBuffer" + id;

    const frameBufferParent = document.createElement("div");
    frameBufferParent.append(buffer);
    return frameBufferParent;
  }

  private rewritePageIntoHostPage() {
    const style = document.createElement("style");
    const body = document.createElement("body");

    body.append(
      this.buildFrameBufferParent(this.buffers[0], "0"),
      this.buildFrameBufferParent(this.buffers[1], "1")
    );

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
        overflow: hidden;
        animation-duration: 600ms;
      }

      .${framebufferCssClass.initial} {
        animation-duration: 0;
      }

      @keyframes blurFadeOut {
        from { filter: blur(0px); opacity: 1; z-index: 10; }
        50% { filter: blur(15px); opacity: 1; z-index: 10; }
        99% { filter: blur(0px); opacity: 0; z-index: 10; }
        to { filter: blur(0px); opacity: 0; z-index: 0; }
      }

      @keyframes blurFadeIn {
        from { filter: blur(0px); opacity: 0; }
        50% { filter: blur(15px); opacity: 0; }
        99% { filter: blur(0px); opacity: 1; }
        to { filter: blur(0px); opacity: 1; }
      }

      .${framebufferCssClass.active} {
        opacity: 1;
        z-index: 1;
        animation-name: blurFadeIn;
      }

      .${framebufferCssClass.passive} {
        opacity: 0;
        animation-name: blurFadeOut;
      }
    `;

    // also consider clip-path animations

    document.body = body;

    const scriptElements = [...document.head.getElementsByTagName("script")];

    const frameBufferScriptElement = scriptElements.find((v) =>
      v.src.endsWith("framebuffer.js")
    );

    if (!frameBufferScriptElement) {
      throw new Error(
        "Expected script to be named framebuffer.js, but unable to find script tag for that name"
      );
    }

    // remove everything except the link to this script
    scriptElements
      .filter((element) => element !== frameBufferScriptElement)
      .forEach((element) => element.remove());

    [...document.head.childNodes]
      .filter((v) => v.nodeName.toLowerCase() !== "script")
      .forEach((v) => v.remove());

    document.head.append(style);
  }

  public initFrameBuffer() {
    this.rewritePageIntoHostPage();

    window.onpopstate = (ev: PopStateEvent) => {
      this.loadNewBufferFromHistory(ev);
    };

    this.buffers.forEach((buffer) => {
      buffer.addEventListener("load", () => this.onBufferLoadComplete(buffer));
    });

    this.loadNewBufferFromUrl(document.URL);
  }

  private doNewBufferAction(callback: (buffer: HTMLIFrameElement) => void) {
    const newBuffer =
      this.buffers.find((buffer) =>
        buffer.classList.contains(framebufferCssClass.passive)
      ) || this.buffers[0];

    callback(newBuffer);
  }

  private loadNewBufferFromHistory(ev: PopStateEvent) {
    this.doNewBufferAction((buffer) => {
      if (ev.state && ev.state.loadHtmlFromState) {
        buffer.innerHTML = ev.state.html;
        this.transition(buffer);
      }
    });
  }

  private transition(bufferToTransitionTo: HTMLIFrameElement) {
    const bufferToTransitionFrom = this.buffers.find(
      (v) => v !== bufferToTransitionTo
    )!;

    this.removeClasses(bufferToTransitionTo);
    this.removeClasses(bufferToTransitionFrom);

    bufferToTransitionTo.classList.add(framebufferCssClass.active);
    bufferToTransitionFrom.classList.add(framebufferCssClass.passive);
  }

  private removeClasses(buffer: HTMLIFrameElement) {
    buffer.classList.remove(
      framebufferCssClass.active,
      framebufferCssClass.passive
    );
  }

  private redirectOnError(buffer: HTMLIFrameElement): boolean {
    try {
      buffer.contentWindow!.document;
      return false;
    } catch {
      // failed to retrieve document, redirecting to same document so
      // that error is visible to user
      location.href = buffer.src;
      return true;
    }
  }

  private loadNewBufferFromUrl(path: string) {
    this.doNewBufferAction((buffer) => {
      buffer.src = path;
    });
  }

  private onBufferLoadComplete(buffer: HTMLIFrameElement) {
    if (this.redirectOnError(buffer)) {
      return;
    }

    const framedDocument = buffer.contentWindow!.document;
    const origin = framedDocument.location.origin;
    document.title = framedDocument.title;

    if (!framedDocument.documentElement.style.backgroundColor) {
      framedDocument.documentElement.style.backgroundColor = "white";
    }

    const loadNewBufferFromUrl = (href: string) =>
      this.loadNewBufferFromUrl(href);

    Array.from(framedDocument.getElementsByTagName("a")).forEach((element) => {
      const href = element.href;

      if (href && href.startsWith(origin)) {
        element.addEventListener("click", async function (e) {
          e.preventDefault();
          loadNewBufferFromUrl(href);

          console.log("loading: " + href);

          return false;
        });
      } else if (!element.target) {
        element.target = "_parent";
      }
    });

    window.history.pushState(
      {
        html: framedDocument.documentElement.outerHTML,
        loadHtmlFromState: true,
      },
      framedDocument.title,
      framedDocument.location.href
    );

    this.transition(buffer);
  }
}
