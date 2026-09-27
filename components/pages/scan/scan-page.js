"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuCamera, LuCameraOff, LuScanLine } from "react-icons/lu";
import { parseScan, recordCode } from "../../../lib/record-codes.cjs";
import { useT } from "../../shell/preferences";
import { Card, CardHeader } from "../../ui/card";
import PageHeader from "../../ui/page-header";

// Opens a shipment or Container Profile from its label. A hand scanner types
// into the field and presses Enter; on tablets the camera reads the QR code
// where the browser offers BarcodeDetector. Scanning only opens the record:
// the record page applies the usual access rules and nothing is changed here.
export default function ScanPage() {
  const t = useT();
  const router = useRouter();
  const input = useRef(null);
  const video = useRef(null);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [foreign, setForeign] = useState(null);
  const [opening, setOpening] = useState(null);
  const [support, setSupport] = useState("checking");
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    let active = true;
    const detector = window.BarcodeDetector;
    if (!detector || !navigator.mediaDevices?.getUserMedia)
      queueMicrotask(() => active && setSupport("none"));
    else
      detector
        .getSupportedFormats()
        .then((formats) => {
          if (active) setSupport(formats.includes("qr_code") ? "yes" : "none");
        })
        .catch(() => active && setSupport("none"));
    return () => {
      active = false;
    };
  }, []);

  function open(text) {
    const target = parseScan(text, window.location.origin);
    setForeign(null);
    if (!target) {
      setMessage(t("scan.unknown"));
      return false;
    }
    setMessage("");
    if (target.foreignHost) {
      setForeign(target);
      return true;
    }
    setOpening(target);
    router.push(target.path);
    return true;
  }

  // The camera runs only after the user starts it and stops as soon as a label
  // is read, the user stops it or the page is left.
  useEffect(() => {
    if (!camera) return;
    let stopped = false,
      stream = null,
      timer = null,
      lastMiss = "";
    const node = video.current;
    (async () => {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) return;
        node.srcObject = stream;
        await node.play();
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(node);
            for (const code of codes) {
              if (parseScan(code.rawValue, window.location.origin)) {
                setCamera(false);
                open(code.rawValue);
                return;
              }
              if (code.rawValue !== lastMiss) {
                lastMiss = code.rawValue;
                setMessage(t("scan.unknown"));
              }
            }
          } catch {
            // A frame that cannot be read is skipped; the next one is tried.
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (error) {
        if (stopped) return;
        setCameraError(
          error?.name === "NotAllowedError" ? "denied" : "unavailable",
        );
        setCamera(false);
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (node) node.srcObject = null;
    };
    // `open` and `t` are left out on purpose: restarting the camera for them
    // would ask for the camera again.
  }, [camera]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        scene="scan"
        tone="primary"
        position="50% 45%"
        eyebrow={t("scan.eyebrow")}
        title={t("scan.title")}
        description={t("scan.desc")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          as="section"
          aria-labelledby="scan-code-title"
          className="space-y-4"
        >
          <CardHeader
            id="scan-code-title"
            title={t("scan.code")}
            description={t("scan.code.desc")}
          />
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (open(value)) setValue("");
              else input.current?.select();
            }}
          >
            <label className="block text-sm font-medium" htmlFor="scan-value">
              {t("scan.field")}
            </label>
            <div className="flex gap-2">
              <input
                ref={input}
                id="scan-value"
                // A hand scanner types into whatever has focus.
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="go"
                aria-describedby="scan-hint"
                aria-invalid={message ? true : undefined}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="S-000012"
                className="input min-h-12 w-full min-w-0 font-mono text-base"
              />
              <button type="submit" className="btn min-h-12 btn-primary">
                <LuScanLine className="size-5" aria-hidden="true" />
                {t("scan.open")}
              </button>
            </div>
            <p id="scan-hint" className="text-sm text-base-content/70">
              {t("scan.hint")}
            </p>
          </form>
          <div aria-live="polite" className="space-y-3">
            {message && (
              <p
                role="alert"
                className="rounded-box border border-error/40 bg-error/10 p-3 text-sm"
              >
                {message}
              </p>
            )}
            {opening && !foreign && (
              <p className="rounded-box bg-base-200 p-3 text-sm">
                {t("scan.opening", {
                  code: recordCode(opening.kind, opening.id),
                })}
              </p>
            )}
            {foreign && (
              <div className="space-y-3 rounded-box border border-warning/50 bg-warning/10 p-4 text-sm">
                <p className="font-semibold">
                  {t("scan.foreign.title", { host: foreign.foreignHost })}
                </p>
                <p>
                  {t("scan.foreign.desc", {
                    code: recordCode(foreign.kind, foreign.id),
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn min-h-11 btn-warning"
                    onClick={() => {
                      setOpening(foreign);
                      setForeign(null);
                      router.push(foreign.path);
                    }}
                  >
                    {t("scan.foreign.open", {
                      code: recordCode(foreign.kind, foreign.id),
                    })}
                  </button>
                  <button
                    type="button"
                    className="btn min-h-11 border-base-content/20 btn-ghost"
                    onClick={() => {
                      setForeign(null);
                      input.current?.focus();
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card
          as="section"
          aria-labelledby="scan-camera-title"
          className="space-y-4"
        >
          <CardHeader
            id="scan-camera-title"
            title={t("scan.camera")}
            description={t("scan.camera.desc")}
            action={
              support === "yes" && (
                <button
                  type="button"
                  className={`btn min-h-11 ${camera ? "border-base-content/20 btn-ghost" : "btn-primary"}`}
                  aria-pressed={camera}
                  onClick={() => {
                    setCameraError("");
                    setMessage("");
                    setCamera((on) => !on);
                  }}
                >
                  {camera ? (
                    <LuCameraOff className="size-5" aria-hidden="true" />
                  ) : (
                    <LuCamera className="size-5" aria-hidden="true" />
                  )}
                  {t(camera ? "scan.camera.stop" : "scan.camera.start")}
                </button>
              )
            }
          />
          <div
            data-theme="nwts-dark"
            className={`relative flex items-center justify-center overflow-hidden rounded-box bg-base-300 text-base-content ${support === "yes" ? "aspect-[4/3]" : "min-h-32"}`}
          >
            <video
              ref={video}
              muted
              playsInline
              aria-label={t("scan.camera.view")}
              className={`absolute inset-0 size-full object-cover ${camera ? "" : "hidden"}`}
            />
            {camera ? (
              <span
                aria-hidden="true"
                className="relative size-1/2 rounded-2xl border-4 border-primary shadow-[0_0_0_100vmax_rgb(0_0_0/35%)]"
              />
            ) : (
              <p className="max-w-xs p-6 text-center text-sm text-base-content/75">
                {support === "checking"
                  ? t("common.loading")
                  : support === "none"
                    ? t("scan.camera.none")
                    : cameraError
                      ? t(`scan.camera.${cameraError}`)
                      : t("scan.camera.idle")}
              </p>
            )}
          </div>
          <p className="text-sm text-base-content/70">
            {t("scan.camera.note")}
          </p>
        </Card>
      </div>
    </main>
  );
}
