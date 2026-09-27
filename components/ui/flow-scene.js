"use client";
import { LuLayers, LuTruck, LuWarehouse } from "react-icons/lu";
import { useT } from "../shell/preferences";
import { SceneImage } from "./scene";

// Positions on public/scenes/flow.webp (percent of width and height): the pin
// sits above truck, hall and tunnel, the label to its right.
export const FLOW_STAGES = [
  { key: "step1", tone: "step-1", icon: LuTruck, x: 13.4, label: 18.5 },
  { key: "step2", tone: "step-2", icon: LuWarehouse, x: 47, label: 52 },
  { key: "step3", tone: "step-3", icon: LuLayers, x: 82.7, label: 87.8 },
];

const TONE = {
  "step-1": "border-step-1 text-step-1 shadow-step-1/60",
  "step-2": "border-step-2 text-step-2 shadow-step-2/60",
  "step-3": "border-step-3 text-step-3 shadow-step-3/60",
};
const TIP = {
  "step-1": "border-t-step-1",
  "step-2": "border-t-step-2",
  "step-3": "border-t-step-3",
};

// The three phases on one photo. Pins and labels are drawn here, so they follow
// the interface language; sizes scale with the width of the image (cqw).
// Decorative for screen readers: the figures next to it carry the content.
export default function FlowScene({ preload = false, sizes, children }) {
  const t = useT();
  return (
    <div className="@container relative">
      <div className="relative aspect-[3/1] overflow-hidden">
        <SceneImage
          scene="flow"
          preload={preload}
          sizes={sizes || "(min-width: 1280px) 1200px, 100vw"}
        />
        <div aria-hidden="true">
          {FLOW_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.key}>
                <span
                  className={`absolute top-[23%] flex size-[6.4cqw] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.35cqw] bg-base-300/55 shadow-[0_0_2.4cqw] ${TONE[stage.tone]}`}
                  style={{ left: `${stage.x}%` }}
                >
                  <Icon className="size-[3cqw]" />
                  <span
                    className={`absolute top-full left-1/2 -translate-x-1/2 border-x-[1.1cqw] border-t-[1.5cqw] border-x-transparent ${TIP[stage.tone]}`}
                  />
                </span>
                <span
                  className="absolute top-[11%] hidden w-[12.5%] flex-col text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.6)] @xl:flex"
                  style={{ left: `${stage.label}%` }}
                >
                  <span
                    className={`font-mono text-[3.2cqw] leading-none font-bold ${TONE[stage.tone].split(" ")[1]}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-[0.4cqw] text-[1.9cqw] leading-tight font-semibold">
                    {t(`flow.${stage.key}.title`)}
                  </span>
                  <span className="mt-[0.3cqw] hidden text-[1.3cqw] leading-snug text-white/85 @3xl:block">
                    {t(`flow.${stage.key}.caption`)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
