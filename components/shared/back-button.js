import { useState } from "react";
import { useRouter } from "next/navigation";
import { TiArrowBackOutline } from "react-icons/ti";
import LoadingSpinnerButton from "./loading-spiner-button";

export default function BackButton({ route }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleBackClick = () => {
    setIsNavigating(true);
    router.push(`/${route}`);
  };

  return (
    <div className="flex w-full justify-start">
      <button
        onClick={() => handleBackClick()}
        className="inline-flex h-10 w-10 transform items-center justify-center rounded-full border bg-gray-200 transition-transform duration-300 ease-in-out hover:scale-125"
      >
        {isNavigating ? (
          <LoadingSpinnerButton />
        ) : (
          <TiArrowBackOutline className="h-5 w-5 text-gray-600" />
        )}
      </button>
    </div>
  );
}
