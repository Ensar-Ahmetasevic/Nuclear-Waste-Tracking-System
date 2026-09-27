"use client";
import { useEffect, useRef, useState } from "react";
import { LuBluetooth, LuScanLine, LuX } from "react-icons/lu";
import { parseDeviceCode } from "../../lib/measurement-reading.cjs";
import { useT } from "../shell/preferences";

// Bluetooth Environmental Sensing (0x181A): temperature 0.01 °C, humidity 0.01 %,
// pressure 0.1 Pa. Radiation has no standard characteristic and stays manual.
const SENSING = 0x181a;
const CHARACTERISTICS = {
  Temperature: [0x2a6e, (view) => view.getInt16(0, true) / 100],
  Humidity: [0x2a6f, (view) => view.getUint16(0, true) / 100],
  Pressure: [0x2a6d, (view) => view.getUint32(0, true) / 1000],
};

async function readBluetooth(field) {
  const [uuid, decode] = CHARACTERISTICS[field];
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SENSING] }],
  });
  const server = await device.gatt.connect();
  try {
    const service = await server.getPrimaryService(SENSING);
    const characteristic = await service.getCharacteristic(uuid);
    return {
      device: device.name || device.id,
      value: Math.round(decode(await characteristic.readValue()) * 100) / 100,
    };
  } finally {
    device.gatt.disconnect();
  }
}

// Reads one value from a measuring device: from the code it shows (hand
// scanner, camera or pasted) or over Bluetooth. Other values in the code are
// ignored; each field is read on its own.
export default function DeviceScan({ field, label, onRead, onClose }) {
  const t = useT();
  const video = useRef(null);
  const input = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const bluetooth =
    typeof navigator !== "undefined" &&
    Boolean(navigator.bluetooth) &&
    Boolean(CHARACTERISTICS[field]);
  const camera =
    typeof window !== "undefined" &&
    Boolean(window.BarcodeDetector && navigator.mediaDevices?.getUserMedia);

  // A hand scanner types into the focused field and ends with Enter.
  useEffect(() => input.current?.focus(), []);

  function readCode(text, method = "CODE") {
    const reading = parseDeviceCode(text);
    const value = reading?.values[field];
    if (value == null) {
      setMessage(t("dev.none", { parameter: label }));
      return false;
    }
    onRead({ value, method, device: reading.device });
    return true;
  }

  useEffect(() => {
    if (!scanning) return undefined;
    let stream;
    let stopped = false;
    (async () => {
      try {
        const detector = new window.BarcodeDetector({
          formats: ["qr_code", "data_matrix", "code_128"],
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stopped) {
          const codes = await detector.detect(video.current);
          const text = codes
            .map((row) => row.rawValue)
            .find((value) => parseDeviceCode(value)?.values[field] != null);
          if (text) {
            readCode(text);
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } catch {
        setMessage(t("dev.cameraError"));
        setScanning(false);
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
    // readCode only reports the result; the effect restarts with scanning.
  }, [scanning]);

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`device-code-${field}`}>
          {t("dev.codeLabel", { parameter: label })}
        </label>
        <input
          ref={input}
          id={`device-code-${field}`}
          className="input min-h-11 flex-1 font-mono input-sm"
          placeholder={t("dev.codePlaceholder")}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // The code field sits inside the measurement form; Enter must not save it.
            event.preventDefault();
            if (code.trim()) readCode(code);
          }}
        />
        <button
          type="button"
          className="btn min-h-11 btn-sm"
          disabled={!code.trim()}
          onClick={() => readCode(code)}
        >
          {t("dev.read")}
        </button>
        <button
          type="button"
          className="btn btn-square min-h-11 btn-ghost btn-sm"
          aria-label={t("common.cancel")}
          onClick={onClose}
        >
          <LuX className="size-4" aria-hidden="true" />
        </button>
      </div>
      {(camera || bluetooth) && (
        <div className="flex flex-wrap gap-2">
          {camera && (
            <button
              type="button"
              className="btn min-h-11 btn-outline btn-sm"
              onClick={() => setScanning((value) => !value)}
            >
              <LuScanLine className="size-4" aria-hidden="true" />
              {scanning ? t("dev.stopScan") : t("dev.scan")}
            </button>
          )}
          {bluetooth && (
            <button
              type="button"
              className="btn min-h-11 btn-outline btn-sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage("");
                try {
                  onRead({
                    ...(await readBluetooth(field)),
                    method: "BLUETOOTH",
                  });
                } catch (error) {
                  if (error?.name !== "NotFoundError")
                    setMessage(t("dev.bluetoothError"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LuBluetooth className="size-4" aria-hidden="true" />
              {t("dev.bluetooth")}
            </button>
          )}
        </div>
      )}
      {scanning && (
        <video
          ref={video}
          muted
          playsInline
          className="aspect-video w-full rounded-lg bg-black object-cover"
        />
      )}
      {message && (
        <p role="alert" className="text-sm text-error">
          {message}
        </p>
      )}
    </div>
  );
}
