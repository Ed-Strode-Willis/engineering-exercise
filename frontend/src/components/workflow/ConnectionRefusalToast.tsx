/** Shown in the middle of the screen when a dragged edge is dropped on a handle it cannot use. */
export function ConnectionRefusalToast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <p
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 mx-auto w-fit max-w-[22rem] animate-[connection-refusal-in_180ms_ease-out] rounded-lg border border-red-200 bg-red-50 px-[0.9rem] py-[0.7rem] text-center text-sm text-red-700 shadow-sm"
      role="status"
    >
      {message}
    </p>
  );
}
