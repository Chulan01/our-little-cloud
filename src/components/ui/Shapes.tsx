import type { SVGProps } from "react";

export function Heart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 21s-7.2-4.5-9.4-9.1C.8 8.2 2.7 4.5 6.5 4.5c2.1 0 3.6 1.2 4.5 2.6.9-1.4 2.4-2.6 4.5-2.6 3.8 0 5.7 3.7 3.9 7.4C19.2 16.5 12 21 12 21Z" />
    </svg>
  );
}

export function Cloud(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 96 56" fill="currentColor" aria-hidden {...props}>
      <path d="M30.4 48h39.4C82 48 90 41.7 90 31.9 90 23 83.1 16 74.1 16c-2.9 0-5.8.8-8.1 2.2C61.8 9.2 53.1 4 43.1 4 29.9 4 19.1 13.5 17.8 26.1 10.9 27.4 6 31.9 6 37.8 6 44.1 11.8 48 30.4 48Z" />
    </svg>
  );
}
