export default function LoadingSpinnerPage() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex flex-col items-center space-y-6 rounded-lg bg-base-100 p-8">
        <p>Loading ...</p>
        <span className="loading loading-bars loading-lg text-primary"></span>
      </div>
    </div>
  );
}
