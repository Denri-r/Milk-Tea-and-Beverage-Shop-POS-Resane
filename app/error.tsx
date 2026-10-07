"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fatal-error">
      <h1>Let’s get you back to the counter.</h1>
      <p>
        The POS couldn’t load. Check that the local database folder is writable,
        then try again.
      </p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
