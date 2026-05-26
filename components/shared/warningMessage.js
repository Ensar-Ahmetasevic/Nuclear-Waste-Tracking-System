import { LuAlertTriangle } from "react-icons/lu";

export default function WarningMessage({ warningColor, warningMessage }) {
  return (
    <div
      className={`alert ${warningColor} flex w-full justify-center px-3 py-4 text-sm text-white sm:text-base`}
    >
      <div className="flex w-full max-w-full flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <LuAlertTriangle className="h-8 w-8 shrink-0 animate-pulse sm:h-10 sm:w-10" />
        <span className="break-words text-center sm:text-left">
          {warningMessage}
        </span>
      </div>
    </div>
  );
}
