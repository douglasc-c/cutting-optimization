import React from 'react';
const paths: Record<string, string> = {
  cut: 'M4 4l16 16M4 20L20 4M7 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M7 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  plus: 'M12 5v14M5 12h14',
  save: 'M5 3h12l4 4v14H3V3h2M7 3v6h10V3M7 21v-8h10v8',
  folder: 'M3 6h7l2 2h9v12H3V6',
  export: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  copy: 'M8 8h13v13H8V8M16 8V3H3v13h5',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  play: 'm8 4 12 8-12 8V4',
  stop: 'M5 5h14v14H5V5',
  minus: 'M5 12h14',
  fit: 'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6',
  undo: 'M7 4 2 9l5 5M2 9h11a8 8 0 0 1 8 8',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M18 6 6 18',
  grid: 'M3 3h18v18H3V3M3 9h18M3 15h18M9 3v18M15 3v18',
  chevron: 'm6 9 6 6 6-6',
};
export default function Icon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.plus} />
    </svg>
  );
}
