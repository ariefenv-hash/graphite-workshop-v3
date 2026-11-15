/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { BarrelShape, GraphiteGrade } from '../../game/types';

interface PencilCraftSvgProps {
  grade: GraphiteGrade;
  barrelShape: BarrelShape;
  lacquerThickness: number;
}

export const PencilCraftSvg: React.FC<PencilCraftSvgProps> = ({
  grade,
  barrelShape,
  lacquerThickness,
}) => {
  const { scheme } = useMd3Theme();

  const lacquerOpacity = 0.45 + (lacquerThickness / 120) * 0.55;
  const graphiteColor =
    grade === '4B'
      ? '#18181B'
      : grade === '2B'
        ? '#27272A'
        : grade === 'HB'
          ? '#3F3F46'
          : grade === '2H'
            ? '#52525B'
            : '#71717A';

  const barrelRadius = barrelShape === 'round' ? 14 : 2;

  return (
    <svg
      viewBox="0 0 380 80"
      className="w-full sm:max-w-[360px] h-[72px] shrink-0"
      role="img"
      aria-label={`当前正在加工 ${grade} ${barrelShape} 铅笔`}
    >
      <defs>
        <linearGradient id="ferruleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4C15A" />
          <stop offset="45%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#9A7B16" />
        </linearGradient>
        <linearGradient id="cedarConeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EBC69A" />
          <stop offset="55%" stopColor="#DEB27E" />
          <stop offset="100%" stopColor="#C8965E" />
        </linearGradient>
        <linearGradient id="roundSheenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* Subtle bench shadow */}
      <ellipse cx="192" cy="67" rx="166" ry="4" fill="#000000" opacity="0.08" />

      {/* Rubber Eraser */}
      <rect x="10" y="23" width="22" height="34" rx="5" fill="#C97A7E" />
      <rect x="10" y="23" width="22" height="10" rx="4" fill="#FFFFFF" opacity="0.16" />

      {/* Brass Ferrule with crimp bands */}
      <rect x="30" y="22" width="20" height="36" rx="2" fill="url(#ferruleGrad)" />
      <line x1="35" y1="23" x2="35" y2="57" stroke="#785D0E" strokeWidth="1.5" opacity="0.6" />
      <line x1="40" y1="23" x2="40" y2="57" stroke="#FFF4C4" strokeWidth="1" opacity="0.55" />
      <line x1="45" y1="23" x2="45" y2="57" stroke="#785D0E" strokeWidth="1.5" opacity="0.6" />

      {/* Barrel Body */}
      {barrelShape === 'cone' ? (
        <polygon
          points="50,21 268,26 268,54 50,59"
          fill={scheme.primary}
          fillOpacity={lacquerOpacity}
        />
      ) : (
        <rect
          x="50"
          y="22"
          width="218"
          height="36"
          rx={barrelRadius}
          fill={scheme.primary}
          fillOpacity={lacquerOpacity}
        />
      )}

      {/* Barrel Surface Shading */}
      {barrelShape === 'hex' && (
        <>
          <rect
            x="50"
            y="22"
            width="218"
            height="10"
            rx="1"
            fill="#FFFFFF"
            fillOpacity="0.16"
          />
          <rect
            x="50"
            y="48"
            width="218"
            height="10"
            rx="1"
            fill="#000000"
            fillOpacity="0.16"
          />
          <line
            x1="50"
            y1="32"
            x2="268"
            y2="32"
            stroke={scheme.onPrimary}
            strokeOpacity="0.28"
            strokeWidth="1.2"
          />
          <line
            x1="50"
            y1="48"
            x2="268"
            y2="48"
            stroke="#000000"
            strokeOpacity="0.18"
            strokeWidth="1.2"
          />
        </>
      )}

      {barrelShape === 'round' && (
        <rect
          x="50"
          y="22"
          width="218"
          height="36"
          rx={barrelRadius}
          fill="url(#roundSheenGrad)"
        />
      )}

      {barrelShape === 'cone' && (
        <polygon points="50,21 268,26 268,36 50,34" fill="#FFFFFF" fillOpacity="0.15" />
      )}

      {/* Hot-foil Brand Stamping */}
      <text
        x="159"
        y="44"
        textAnchor="middle"
        fontSize="11"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
        letterSpacing="0.5"
        fill={scheme.onPrimary}
      >
        CEDAR · {grade} · {barrelShape.toUpperCase()}
      </text>

      {/* Sharpened Cedar Cone */}
      {barrelShape === 'cone' ? (
        <polygon points="268,26 334,37 334,43 268,54" fill="url(#cedarConeGrad)" />
      ) : (
        <polygon points="268,22 334,37 334,43 268,58" fill="url(#cedarConeGrad)" />
      )}
      <line x1="274" y1="31" x2="320" y2="38" stroke="#B6824B" strokeWidth="1" opacity="0.45" />
      <line x1="274" y1="49" x2="320" y2="42" stroke="#9C6A37" strokeWidth="1" opacity="0.45" />

      {/* Graphite Lead Tip */}
      <polygon points="334,37 364,40 334,43" fill={graphiteColor} />
      <line x1="335" y1="39" x2="357" y2="40" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.25" />
    </svg>
  );
};
