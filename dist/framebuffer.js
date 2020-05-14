"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function initFrameBuffer() {
    const fb = new frameBuffer();
    fb.initFrameBuffer();
}
if (window === window.parent) {
    // only modify page if root frame
    window.onload = initFrameBuffer;
}
var framebufferCssClass;
(function (framebufferCssClass) {
    framebufferCssClass["active"] = "framebuffer-active";
    framebufferCssClass["passive"] = "framebuffer-passive";
    framebufferCssClass["initial"] = "framebuffer-initial";
})(framebufferCssClass || (framebufferCssClass = {}));
class frameBuffer {
    constructor() {
        this.buffers = [
            document.createElement("iframe"),
            document.createElement("iframe"),
        ];
    }
    buildFrameBufferParent(buffer, id) {
        buffer.className = "frameBuffer";
        buffer.id = "frameBuffer" + id;
        const frameBufferParent = document.createElement("div");
        frameBufferParent.append(buffer);
        return frameBufferParent;
    }
    rewritePageIntoHostPage() {
        const style = document.createElement("style");
        const body = document.createElement("body");
        body.append(this.buildFrameBufferParent(this.buffers[0], "0"), this.buildFrameBufferParent(this.buffers[1], "1"));
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
        const frameBufferScriptElement = scriptElements.find((v) => v.src.endsWith("framebuffer.js"));
        if (!frameBufferScriptElement) {
            throw new Error("Expected script to be named framebuffer.js, but unable to find script tag for that name");
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
    initFrameBuffer() {
        this.rewritePageIntoHostPage();
        window.onpopstate = (ev) => {
            this.loadNewBufferFromHistory(ev);
        };
        this.buffers.forEach((buffer) => {
            buffer.addEventListener("load", () => this.onBufferLoadComplete(buffer));
        });
        this.loadNewBufferFromUrl(document.URL);
    }
    doNewBufferAction(callback) {
        const newBuffer = this.buffers.find((buffer) => buffer.classList.contains(framebufferCssClass.passive)) || this.buffers[0];
        callback(newBuffer);
    }
    loadNewBufferFromHistory(ev) {
        this.doNewBufferAction((buffer) => {
            if (ev.state && ev.state.loadHtmlFromState) {
                buffer.innerHTML = ev.state.html;
                this.transition(buffer);
            }
        });
    }
    transition(bufferToTransitionTo) {
        const bufferToTransitionFrom = this.buffers.find((v) => v !== bufferToTransitionTo);
        this.removeClasses(bufferToTransitionTo);
        this.removeClasses(bufferToTransitionFrom);
        bufferToTransitionTo.classList.add(framebufferCssClass.active);
        bufferToTransitionFrom.classList.add(framebufferCssClass.passive);
    }
    removeClasses(buffer) {
        buffer.classList.remove(framebufferCssClass.active, framebufferCssClass.passive);
    }
    redirectOnError(buffer) {
        try {
            buffer.contentWindow.document;
            return false;
        }
        catch (_a) {
            // failed to retrieve document, redirecting to same document so
            // that error is visible to user
            location.href = buffer.src;
            return true;
        }
    }
    loadNewBufferFromUrl(path) {
        this.doNewBufferAction((buffer) => {
            buffer.src = path;
        });
    }
    onBufferLoadComplete(buffer) {
        if (this.redirectOnError(buffer)) {
            return;
        }
        const framedDocument = buffer.contentWindow.document;
        const origin = framedDocument.location.origin;
        document.title = framedDocument.title;
        if (!framedDocument.documentElement.style.backgroundColor) {
            framedDocument.documentElement.style.backgroundColor = "white";
        }
        const loadNewBufferFromUrl = (href) => this.loadNewBufferFromUrl(href);
        Array.from(framedDocument.getElementsByTagName("a")).forEach((element) => {
            const href = element.href;
            if (href && href.startsWith(origin)) {
                element.addEventListener("click", function (e) {
                    return __awaiter(this, void 0, void 0, function* () {
                        e.preventDefault();
                        loadNewBufferFromUrl(href);
                        console.log("loading: " + href);
                        return false;
                    });
                });
            }
            else if (!element.target) {
                element.target = "_parent";
            }
        });
        window.history.pushState({
            html: framedDocument.documentElement.outerHTML,
            loadHtmlFromState: true,
        }, framedDocument.title, framedDocument.location.href);
        this.transition(buffer);
    }
}
