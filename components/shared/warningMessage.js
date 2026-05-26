import { LuAlertTriangle } from "react-icons/lu";

export default function WarningMessage({ warningColor, warningMessage }) {
  return (
    <div
      className={`alert ${warningColor} mb-6 flex w-full justify-center text-sm text-white sm:text-lg`}
    >
      <div className="flex flex-col items-center space-y-4">
        <div>
          <LuAlertTriangle className="h-10 w-10 animate-pulse" />
        </div>
        {/* Warning Message */}
        <div>
          <span>{warningMessage}</span>
        </div>
      </div>
    </div>
  );
}
