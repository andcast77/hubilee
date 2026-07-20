'use client';

import dynamic from 'next/dynamic';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((m) => m.Turnstile), {
  ssr: false,
});

const DEFAULT_SITE_KEY = '1x00000000000000000000AA';
const MISTAKEN_SECRET_AS_SITEKEY = '1x0000000000000000000000000000000AA';

export function getTurnstileSiteKey(): string {
  const raw = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (!raw || raw === MISTAKEN_SECRET_AS_SITEKEY) return DEFAULT_SITE_KEY;
  return raw;
}

type Props = {
  onToken: (token: string | null) => void;
  variant?: 'default' | 'compact';
};

/** interaction-only + flexible: UI solo si hace falta; ancho del contenedor cuando aparece. */
export function RegistrationTurnstile({ onToken, variant = 'default' }: Props) {
  const siteKey = getTurnstileSiteKey();
  const compact = variant === 'compact';

  return (
    <div
      className={
        'flex w-full min-h-0 justify-center ' +
        (compact ? 'py-1' : 'py-2') +
        ' [&_iframe]:block [&_iframe]:min-h-[65px] [&_iframe]:min-w-[300px] [&_iframe]:w-full [&_iframe]:max-w-none'
      }
    >
      <Turnstile
        siteKey={siteKey}
        onSuccess={(t) => onToken(t)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
        options={{
          appearance: 'interaction-only',
          theme: 'dark',
          language: 'es',
          size: 'flexible',
        }}
      />
    </div>
  );
}
