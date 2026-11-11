'use client';
import { useEffect } from 'react';
import { reportClientError } from '@junta/ui';
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    void reportClientError(error);
  }, [error]);
  return (
    <section className="empty">
      <h1>Não foi possível abrir esta página.</h1>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}
