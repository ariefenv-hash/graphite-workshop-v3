/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { SystemUIShape } from '../../aosp/RippleShader';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { HOME_PORT, TRADE_DESTINATIONS } from '../../game/constants';
import { ActiveShipment, RecentShipArrival } from '../../game/types';
import { useSystemUIRipple } from '../md3/useRippleHooks';

export const MAP_VB_WIDTH = 1000;
export const MAP_VB_HEIGHT = 480;

function toSvgX(pctX: number): number {
  return pctX * (MAP_VB_WIDTH / 100);
}

function toSvgY(pctY: number): number {
  return pctY * (MAP_VB_HEIGHT / 100);
}

/**
 * Computes quadratic Bezier control point for a great-circle-style maritime arc.
 * Handles trans-Pacific route (US) gracefully by arching northward cleanly.
 */
function getRouteControlPoint(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const dx = Math.abs(x2 - x1);
  const mx = (x1 + x2) * 0.5;
  const arcLift = Math.max(42, Math.min(130, dx * 0.24));
  const my = Math.min(y1, y2) - arcLift;
  return [mx, Math.max(18, my)];
}

function sampleQuadBezier(
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number
): [number, number] {
  const mt = 1 - t;
  const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
  const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
  return [x, y];
}

function sampleQuadTangentAngle(
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number
): number {
  const mt = 1 - t;
  const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
  const dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Converts normalized (0..100) map coordinates to actual pixel coordinates inside the
 * SVG's `preserveAspectRatio="xMidYMid meet"` viewport box so SystemUI ripples align pixel-for-pixel.
 */
function projectPctToCanvasPx(
  pctX: number,
  pctY: number,
  width: number,
  height: number
): { x: number; y: number } {
  const scale = Math.min(width / MAP_VB_WIDTH, height / MAP_VB_HEIGHT);
  const drawnW = MAP_VB_WIDTH * scale;
  const drawnH = MAP_VB_HEIGHT * scale;
  const offsetX = (width - drawnW) * 0.5;
  const offsetY = (height - drawnH) * 0.5;
  return {
    x: offsetX + (pctX / 100) * drawnW,
    y: offsetY + (pctY / 100) * drawnH,
  };
}

// High-craft cartographic landmass silhouettes projected into 1000x480
// (lon -170..+175 -> x 40..960, lat +78..-56 -> y 20..450)
const CONTINENT_PATHS = {
  northAmerica:
    'M 64,66 L 106,54 L 154,54 L 204,48 L 244,58 L 258,84 L 244,104 L 266,94 L 284,74 L 318,90 L 344,116 L 320,132 L 298,144 L 282,168 L 268,184 L 256,174 L 242,188 L 222,190 L 210,174 L 194,168 L 204,196 L 222,216 L 252,232 L 260,242 L 244,244 L 216,226 L 190,196 L 166,164 L 154,132 L 136,104 L 104,88 L 72,88 Z',
  greenland:
    'M 326,30 L 378,24 L 414,42 L 398,74 L 368,88 L 344,74 L 328,50 Z',
  southAmerica:
    'M 262,240 L 296,236 L 336,248 L 376,274 L 402,296 L 392,334 L 366,374 L 338,412 L 324,444 L 306,440 L 304,404 L 296,356 L 278,314 L 268,284 L 254,262 Z',
  europe:
    'M 468,118 L 478,94 L 504,76 L 538,58 L 566,54 L 580,72 L 562,88 L 542,92 L 546,112 L 564,118 L 560,134 L 542,142 L 532,158 L 520,148 L 504,144 L 486,154 L 468,152 L 464,138 L 480,126 Z',
  britishIsles:
    'M 476,94 L 490,90 L 496,108 L 482,114 L 474,106 Z',
  africa:
    'M 464,162 L 508,158 L 546,168 L 582,172 L 598,202 L 626,232 L 622,262 L 600,296 L 582,344 L 562,382 L 544,378 L 532,338 L 522,292 L 504,268 L 472,262 L 452,236 L 450,204 Z',
  madagascar:
    'M 612,320 L 624,316 L 626,348 L 614,356 L 606,342 Z',
  asia:
    'M 576,66 L 642,50 L 722,48 L 812,52 L 892,58 L 938,72 L 916,94 L 882,98 L 878,124 L 856,142 L 832,138 L 826,158 L 818,178 L 796,204 L 774,230 L 776,262 L 754,254 L 742,226 L 724,206 L 702,240 L 682,216 L 664,196 L 642,212 L 618,224 L 596,202 L 584,174 L 568,152 L 568,118 L 578,94 Z',
  japan:
    'M 860,136 L 874,126 L 882,140 L 872,158 L 856,168 L 848,160 Z',
  maritimeSeAsia:
    'M 758,266 L 776,274 L 788,288 L 766,284 Z M 796,264 L 824,262 L 830,282 L 802,286 Z M 846,278 L 878,284 L 884,298 L 850,294 Z',
  australia:
    'M 804,328 L 844,316 L 884,322 L 908,346 L 904,380 L 878,398 L 844,394 L 810,384 L 796,356 Z',
  newZealand:
    'M 936,396 L 950,388 L 952,412 L 932,424 L 926,412 Z',
};

export interface WorldTradeMapHandle {
  emitAtPort: (pctX: number, pctY: number, isGold: boolean) => void;
}

interface WorldTradeMapProps {
  shipments: ActiveShipment[];
  recentArrival: RecentShipArrival | null;
  onClearArrival: () => void;
  dispatchSignal?: { id: number; isGold: boolean } | null;
}

export const WorldTradeMap: React.FC<WorldTradeMapProps> = ({
  shipments,
  recentArrival,
  onClearArrival,
  dispatchSignal,
}) => {
  const { scheme } = useMd3Theme();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { canvasRef, emitTradeRipple } = useSystemUIRipple();

  const emitPortRipple = useCallback(
    (pctX: number, pctY: number, isGold: boolean, shape: SystemUIShape) => {
      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const pos = projectPctToCanvasPx(pctX, pctY, rect.width, rect.height);
      emitTradeRipple({
        centerX: pos.x,
        centerY: pos.y,
        targetWidth: isGold ? 210 : 155,
        targetHeight: isGold ? 210 : 155,
        shape,
        isGold,
        sparkleStrength: isGold ? 1.0 : 0.72,
      });
    },
    [emitTradeRipple]
  );

  useEffect(() => {
    if (!recentArrival) return;
    emitPortRipple(
      recentArrival.x,
      recentArrival.y,
      recentArrival.isGold,
      recentArrival.isGold ? SystemUIShape.ROUNDED_BOX : SystemUIShape.CIRCLE
    );
    onClearArrival();
  }, [recentArrival, emitPortRipple, onClearArrival]);

  useEffect(() => {
    if (!dispatchSignal) return;
    emitPortRipple(HOME_PORT.x, HOME_PORT.y, dispatchSignal.isGold, SystemUIShape.ELLIPSE);
  }, [dispatchSignal, emitPortRipple]);

  const homeX = toSvgX(HOME_PORT.x);
  const homeY = toSvgY(HOME_PORT.y);

  return (
    <div
      ref={hostRef}
      className="relative w-full aspect-[1000/480] max-h-[440px] mx-auto rounded-2xl overflow-hidden"
      style={{
        backgroundColor: scheme.surfaceContainerLowest,
        border: `1px solid ${scheme.outlineVariant}`,
      }}
    >
      <svg
        viewBox={`0 0 ${MAP_VB_WIDTH} ${MAP_VB_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        aria-label="全球文具贸易航线地图"
      >
        <defs>
          <radialGradient id="oceanGlow" cx="55%" cy="45%" r="65%">
            <stop offset="0%" stopColor={scheme.surfaceContainerLow} stopOpacity="0.6" />
            <stop offset="100%" stopColor={scheme.surfaceContainerLowest} stopOpacity="1" />
          </radialGradient>
          <filter id="landShadow" x="-4%" y="-4%" width="108%" height="108%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Ocean Field */}
        <rect x="0" y="0" width={MAP_VB_WIDTH} height={MAP_VB_HEIGHT} fill="url(#oceanGlow)" />

        {/* Graticule (Latitude & Longitude lines) */}
        {[96, 182, 270, 356].map((y, idx) => (
          <line
            key={`lat-${y}`}
            x1="0"
            y1={y}
            x2={MAP_VB_WIDTH}
            y2={y}
            stroke={scheme.outlineVariant}
            strokeWidth={idx === 2 ? '0.9' : '0.55'}
            strokeDasharray={idx === 2 ? '4 4' : undefined}
            opacity={idx === 2 ? '0.75' : '0.45'}
          />
        ))}
        {[160, 326, 493, 660, 826].map((x, idx) => (
          <line
            key={`lon-${x}`}
            x1={x}
            y1="0"
            x2={x}
            y2={MAP_VB_HEIGHT}
            stroke={scheme.outlineVariant}
            strokeWidth={idx === 2 ? '0.9' : '0.55'}
            strokeDasharray={idx === 2 ? '4 4' : undefined}
            opacity={idx === 2 ? '0.65' : '0.4'}
          />
        ))}

        {/* Equator Label */}
        <text
          x="14"
          y="264"
          fontSize="9"
          fontFamily="JetBrains Mono, monospace"
          fill={scheme.outline}
          opacity="0.7"
        >
          0° EQ
        </text>

        {/* Cartographic Continents */}
        <g
          fill={scheme.surfaceContainerHigh}
          stroke={scheme.outlineVariant}
          strokeWidth="1.2"
          strokeLinejoin="round"
          filter="url(#landShadow)"
        >
          <path d={CONTINENT_PATHS.northAmerica} />
          <path d={CONTINENT_PATHS.greenland} />
          <path d={CONTINENT_PATHS.southAmerica} />
          <path d={CONTINENT_PATHS.europe} />
          <path d={CONTINENT_PATHS.britishIsles} />
          <path d={CONTINENT_PATHS.africa} />
          <path d={CONTINENT_PATHS.madagascar} />
          <path d={CONTINENT_PATHS.asia} />
          <path d={CONTINENT_PATHS.japan} />
          <path d={CONTINENT_PATHS.maritimeSeAsia} />
          <path d={CONTINENT_PATHS.australia} />
          <path d={CONTINENT_PATHS.newZealand} />
        </g>

        {/* Great-Circle Shipping Lanes */}
        {TRADE_DESTINATIONS.map((dest) => {
          const dx = toSvgX(dest.mapX);
          const dy = toSvgY(dest.mapY);
          const [cx, cy] = getRouteControlPoint(homeX, homeY, dx, dy);
          return (
            <path
              key={dest.countryCode}
              d={`M ${homeX} ${homeY} Q ${cx} ${cy} ${dx} ${dy}`}
              fill="none"
              stroke={scheme.outline}
              strokeWidth="1.3"
              strokeDasharray="4 4"
              opacity="0.45"
            />
          );
        })}

        {/* Active Curved Shipments & Animated Vessel Icons */}
        {shipments.map((ship) => {
          const t = Math.max(0, Math.min(1, 1 - ship.remainingSec / ship.totalSec));
          const tx = toSvgX(ship.toX);
          const ty = toSvgY(ship.toY);
          const [cx, cy] = getRouteControlPoint(homeX, homeY, tx, ty);
          const [sx, sy] = sampleQuadBezier(t, homeX, homeY, cx, cy, tx, ty);
          const angleDeg = sampleQuadTangentAngle(t, homeX, homeY, cx, cy, tx, ty);
          const routeColor = ship.isGold ? '#D97706' : scheme.primary;

          return (
            <g key={ship.id}>
              <path
                d={`M ${homeX} ${homeY} Q ${cx} ${cy} ${tx} ${ty}`}
                fill="none"
                stroke={routeColor}
                strokeWidth="2.4"
                strokeOpacity="0.82"
              />
              {/* Vessel Beacon */}
              <g transform={`translate(${sx}, ${sy}) rotate(${angleDeg})`}>
                <circle r="10" fill={routeColor} opacity="0.18" />
                <polygon
                  points="7,0 -4,-4.2 -2,0 -4,4.2"
                  fill={ship.isGold ? '#F59E0B' : scheme.primary}
                  stroke={scheme.surfaceContainerLowest}
                  strokeWidth="1.2"
                />
              </g>
            </g>
          );
        })}

        {/* Home Port Marker */}
        <g>
          <circle cx={homeX} cy={homeY} r="13" fill={scheme.primary} opacity="0.18" />
          <circle
            cx={homeX}
            cy={homeY}
            r="6"
            fill={scheme.primary}
            stroke={scheme.surfaceContainerLowest}
            strokeWidth="2"
          />
          <text
            x={homeX}
            y={homeY + 22}
            textAnchor="middle"
            fontSize="11.5"
            fontFamily="Noto Sans SC, sans-serif"
            fontWeight="700"
            fill={scheme.onSurface}
            stroke={scheme.surfaceContainerLowest}
            strokeWidth="3.5"
            paintOrder="stroke"
          >
            石墨工坊母港
          </text>
        </g>

        {/* Foreign Port Markers with Haloed Labels */}
        {TRADE_DESTINATIONS.map((dest) => {
          const px = toSvgX(dest.mapX);
          const py = toSvgY(dest.mapY);
          // Offset European labels slightly so GB / CH / DE never overlap
          const labelOffsetX =
            dest.countryCode === 'GB'
              ? -24
              : dest.countryCode === 'DE'
                ? 22
                : dest.countryCode === 'CH'
                  ? 16
                  : 0;
          const labelOffsetY =
            dest.countryCode === 'CH' ? 17 : dest.countryCode === 'JP' ? -13 : -12;

          return (
            <g key={dest.countryCode}>
              <circle
                cx={px}
                cy={py}
                r="4.5"
                fill={scheme.secondary}
                stroke={scheme.surfaceContainerLowest}
                strokeWidth="1.6"
              />
              <text
                x={px + labelOffsetX}
                y={py + labelOffsetY}
                textAnchor="middle"
                fontSize="10.5"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
                fill={scheme.onSurfaceVariant}
                stroke={scheme.surfaceContainerLowest}
                strokeWidth="3.2"
                paintOrder="stroke"
              >
                {dest.countryCode} · ×{dest.fxRate}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Isolated SystemUI 1750ms Ripple Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full z-10"
      />
    </div>
  );
};
