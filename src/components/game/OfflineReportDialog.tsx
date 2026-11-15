/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { OfflineReport } from '../../game/types';
import { Md3Button } from '../md3/Md3Button';
import { Md3Dialog } from '../md3/Md3Dialog';

interface OfflineReportDialogProps {
  report: OfflineReport | null;
  onDismiss: () => void;
}

export const OfflineReportDialog: React.FC<OfflineReportDialogProps> = ({
  report,
  onDismiss,
}) => {
  const { scheme } = useMd3Theme();

  return (
    <Md3Dialog
      open={report !== null}
      onClose={onDismiss}
      title="离线工坊结算报告"
      actions={
        <Md3Button variant="filled" onClick={onDismiss}>
          收下收益
        </Md3Button>
      }
    >
      {report && (
        <div className="flex flex-col gap-3">
          <p style={{ color: scheme.onSurfaceVariant }}>
            在您离开的 {Math.round(report.elapsedSeconds / 60)} 分钟内（最高结算 8
            小时），自动流水线持续运转：
          </p>
          <div
            className="rounded-2xl p-4 flex justify-around text-center"
            style={{ backgroundColor: scheme.surfaceContainerLowest }}
          >
            <div>
              <div className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                产出标准铅笔
              </div>
              <div className="font-mono-tabular text-2xl font-bold mt-1" style={{ color: scheme.onSurface }}>
                +{report.craftedPencils} 支
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                结余营业收入
              </div>
              <div className="font-mono-tabular text-2xl font-bold mt-1" style={{ color: scheme.primary }}>
                +{report.earnedCredits} 银元
              </div>
            </div>
          </div>
        </div>
      )}
    </Md3Dialog>
  );
};
