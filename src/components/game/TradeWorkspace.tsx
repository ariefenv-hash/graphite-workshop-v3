/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Globe, RefreshCw, Ship, Sparkles } from 'lucide-react';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { getGradeFromRatio } from '../../game/constants';
import { RecentShipArrival, TradeOrder, WorkshopState } from '../../game/types';
import { Md3Button } from '../md3/Md3Button';
import { Md3Card } from '../md3/Md3Card';
import { Md3Progress } from '../md3/Md3Progress';
import { WorldTradeMap } from './WorldTradeMap';

interface TradeWorkspaceProps {
  state: WorkshopState;
  recentArrival: RecentShipArrival | null;
  onClearArrival: () => void;
  onShipOrder: (order: TradeOrder) => {
    dispatched: boolean;
    isGold: boolean;
    toX: number;
    toY: number;
  };
  onRefreshOrders: () => void;
}

export const TradeWorkspace: React.FC<TradeWorkspaceProps> = ({
  state,
  recentArrival,
  onClearArrival,
  onShipOrder,
  onRefreshOrders,
}) => {
  const { scheme } = useMd3Theme();
  const [dispatchSignal, setDispatchSignal] = useState<{ id: number; isGold: boolean } | null>(
    null
  );
  const currentGrade = getGradeFromRatio(state.params.graphiteRatio);

  const handleDispatch = (order: TradeOrder) => {
    const res = onShipOrder(order);
    if (res.dispatched) {
      setDispatchSignal({ id: Date.now() + Math.random(), isGold: res.isGold });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Md3Card elevated className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold font-display" style={{ color: scheme.onSurface }}>
              全球贸易航线图 · SystemUI 1750ms 航道波纹
            </h2>
            <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
              发货与到港触发独立 SystemUI Shader（1750ms 周期 · 金粉稀有合约高亮）
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="font-mono-tabular text-xs"
              style={{ color: scheme.onSurfaceVariant }}
            >
              商誉 {state.reputation} · 已交运 {state.totalOrdersShipped} 批
            </span>
            <Md3Button
              size="sm"
              variant="tonal"
              disabled={state.credits < 15}
              onClick={onRefreshOrders}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>刷新电报 (15元)</span>
            </Md3Button>
          </div>
        </div>

        <WorldTradeMap
          shipments={state.shipments}
          recentArrival={recentArrival}
          onClearArrival={onClearArrival}
          dispatchSignal={dispatchSignal}
        />

        {state.shipments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {state.shipments.map((ship) => (
              <div
                key={ship.id}
                className="rounded-xl p-3 flex flex-col gap-2"
                style={{
                  backgroundColor: scheme.surfaceContainerLow,
                  border: `1px solid ${scheme.outlineVariant}`,
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className="font-semibold flex items-center gap-1.5"
                    style={{ color: scheme.onSurface }}
                  >
                    <Ship className="w-3.5 h-3.5" style={{ color: scheme.primary }} />
                    <span>{ship.order.countryName}</span>
                  </span>
                  <span className="font-mono-tabular" style={{ color: scheme.primary }}>
                    {Math.ceil(ship.remainingSec)}s
                  </span>
                </div>
                <Md3Progress
                  value={1 - ship.remainingSec / ship.totalSec}
                  label={`${ship.order.countryName}航程进度`}
                  height={5}
                  tone={ship.isGold ? 'tertiary' : 'primary'}
                />
                <div
                  className="flex items-center justify-between text-[11px]"
                  style={{ color: scheme.onSurfaceVariant }}
                >
                  <span>预计结算</span>
                  <span className="font-mono-tabular font-semibold">
                    +{ship.payoutCredits} 银元
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Md3Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.orders.map((order) => {
          const gradeMatches = currentGrade === order.requiredGrade;
          const shapeMatches = state.barrelShape === order.requiredShape;
          const available =
            order.minQuality === 'artisan'
              ? state.inventory.artisan + state.inventory.masterwork
              : state.inventory.standard + state.inventory.artisan + state.inventory.masterwork;
          const canShip = available >= order.quantity;

          return (
            <Md3Card key={order.id} className="flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-medium"
                    style={{ color: order.isRareGold ? scheme.tertiary : scheme.onSurfaceVariant }}
                  >
                    {order.isRareGold
                      ? '金粉稀有合约 · +1 金箔印章'
                      : `${order.countryCode} 常规贸易订单`}
                  </span>
                  <span
                    className="font-mono-tabular text-xs"
                    style={{ color: scheme.onSurfaceVariant }}
                  >
                    {Math.ceil(order.remainingSec)}s
                  </span>
                </div>

                <h3 className="text-base font-bold font-display" style={{ color: scheme.onSurface }}>
                  {order.countryName}
                </h3>
                <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                  {order.buyerName} · 需求 {order.quantity} 支（
                  {order.minQuality === 'artisan' ? '精良以上' : '合格品'}）
                </p>

                <div
                  className="rounded-xl p-3 flex flex-col gap-1.5 text-xs mt-1"
                  style={{ backgroundColor: scheme.surfaceContainerLow }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: scheme.onSurfaceVariant }}>偏好硬度 / 杆型</span>
                    <span
                      className="font-mono-tabular font-semibold"
                      style={{ color: scheme.onSurface }}
                    >
                      {order.requiredGrade} / {order.requiredShape.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: scheme.onSurfaceVariant }}>汇率 / 关税 / 航程</span>
                    <span className="font-mono-tabular" style={{ color: scheme.onSurface }}>
                      ×{order.fxRateSnapshot} · {Math.round(order.tariffRate * 100)}% ·{' '}
                      {order.transitSeconds}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: scheme.onSurfaceVariant }}>当前产线契合溢价</span>
                    <span
                      className="font-mono-tabular font-medium"
                      style={{
                        color: gradeMatches || shapeMatches ? scheme.primary : scheme.onSurfaceVariant,
                      }}
                    >
                      {gradeMatches ? '+18% 硬度 ' : ''}
                      {shapeMatches ? '+12% 杆型' : ''}
                      {!gradeMatches && !shapeMatches ? '标准报价' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <Md3Button
                variant={order.isRareGold ? 'filled' : 'tonal'}
                disabled={!canShip}
                onClick={() => handleDispatch(order)}
                className="w-full"
              >
                {order.isRareGold ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>
                  {canShip
                    ? `派发海运 (${order.quantity}/${available})`
                    : `缺货 (${available}/${order.quantity})`}
                </span>
              </Md3Button>
            </Md3Card>
          );
        })}
      </div>
    </div>
  );
};
