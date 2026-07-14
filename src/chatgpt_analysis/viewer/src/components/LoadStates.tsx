import type { ReactNode } from "react";

export type LoadingStateProps = {
  readonly label: string;
};

export function LoadingState({ label }: LoadingStateProps): ReactNode {
  return (
    <main aria-busy="true" className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12 sm:px-6">
      <section aria-labelledby="loading-heading" className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-sky-800">Loading local data</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950" id="loading-heading">
          {label}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The browser is validating the static atlas before displaying it.</p>
      </section>
    </main>
  );
}

export type EmptyStateProps = {
  readonly chatCount: number;
};

export function EmptyState({ chatCount }: EmptyStateProps): ReactNode {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12 sm:px-6">
      <section aria-labelledby="empty-heading" className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-sky-800">No displayable chats</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950" id="empty-heading">
          The atlas is empty
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The validated atlas contains {chatCount} chats, so there is nothing to display yet.</p>
      </section>
    </main>
  );
}

export type FailureStateProps = {
  readonly message: string;
  readonly onRetry: () => void;
};

export function FailureState({ message, onRetry }: FailureStateProps): ReactNode {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12 sm:px-6">
      <section aria-labelledby="failure-heading" className="w-full rounded-xl border border-rose-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-rose-800">Atlas unavailable</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950" id="failure-heading">
          The atlas could not be displayed
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-700" role="alert">
          {message}
        </p>
        <button
          className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
          onClick={onRetry}
          type="button"
        >
          Retry loading
        </button>
      </section>
    </main>
  );
}
