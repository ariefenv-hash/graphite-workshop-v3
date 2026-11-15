/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EDGE_EFFECT_CONSTANTS } from '../../aosp/EdgeEffect';
import { FRAMEWORK_RIPPLE_CONSTANTS, SYSTEMUI_RIPPLE_CONSTANTS } from '../../aosp/RippleShader';
import { SLIDER_SPEC, SWITCH_SPEC } from '../../aosp/SliderSpec';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { Md3Button } from '../md3/Md3Button';
import { Md3Dialog } from '../md3/Md3Dialog';

interface AospBaselineDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AospBaselineDialog: React.FC<AospBaselineDialogProps> = ({ open, onClose }) => {
  const { scheme, webglSupported, lastUniformsDebug } = useMd3Theme();

  return (
    <Md3Dialog
      open={open}
      onClose={onClose}
      title="AOSP 系统源码基线与 Web 移植说明"
      maxWidthClass="max-w-2xl"
      actions={
        <Md3Button variant="filled" onClick={onClose}>
          关闭说明
        </Md3Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          className="rounded-xl p-3.5 text-xs flex flex-col gap-1.5"
          style={{
            backgroundColor: scheme.surfaceContainerLowest,
            border: `1px solid ${scheme.outlineVariant}`,
          }}
        >
          <div className="font-semibold" style={{ color: scheme.primary }}>
            对照基线：android-17.0.0_r1 &amp; androidx.compose.material3
          </div>
          <p style={{ color: scheme.onSurfaceVariant }}>
            本工坊直接移植 AOSP 平台源码的 MD3 Expressive 组件规范、弹簧动力学（
            <code>SpringForce</code>）及两套原生涟漪着色器（Framework 与 SystemUI），未依赖外部
            MD3 UI 包装库。当前渲染管线：
            {webglSupported ? 'WebGL2 GLSL ES 3.00 活跃' : 'Canvas2D 降级模式'}。
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="font-semibold text-sm" style={{ color: scheme.onSurface }}>
            1. 逐文件对齐常数与双通道隔离
          </h4>
          <ul
            className="list-disc pl-5 text-xs flex flex-col gap-1.5"
            style={{ color: scheme.onSurfaceVariant }}
          >
            <li>
              <strong>Framework Ripple</strong> (<code>RippleAnimationSession.java</code> /{' '}
              <code>RippleShader.java</code>): ENTER ={' '}
              {FRAMEWORK_RIPPLE_CONSTANTS.ENTER_ANIM_DURATION}ms，EXIT ={' '}
              {FRAMEWORK_RIPPLE_CONSTANTS.EXIT_ANIM_DURATION}ms，NOISE ={' '}
              {FRAMEWORK_RIPPLE_CONSTANTS.NOISE_ANIMATION_DURATION}ms，
              <code>computeDelay()</code> 不被倍速缩放；sparkles 使用{' '}
              <code>i*0.1 / 0.05 / step / sin(PI*(t+0.35i))</code>，扩展石墨晕染与木纹各向异性
              uniform。
            </li>
            <li>
              <strong>SystemUI Ripple</strong> (<code>RippleShader.kt</code> /{' '}
              <code>RippleView.kt</code>): 独立通道用于世界贸易航线波纹与金粉订单结算，周期{' '}
              {SYSTEMUI_RIPPLE_CONSTANTS.RIPPLE_DURATION_MS}ms，<code>in_time</code> 为真实毫秒，
              <code>in_pixelDensity</code> 取实际 DPR；sparkles 严格隔离为{' '}
              <code>i*0.01 / h=l+0.1 / smoothstep / abs(sin(PI*o*(t+0.55i)))</code>。
            </li>
            <li>
              <strong>StretchEdgeEffect</strong> (<code>EdgeEffect.java</code> TYPE_STRETCH):
              直接移植 <code>onPullDistance</code>、<code>dampStretchVector</code>（0.016 线性 +
              0.016 指数）与欠阻尼弹簧（ω₀={EDGE_EFFECT_CONSTANTS.NATURAL_FREQUENCY}，ζ=
              {EDGE_EFFECT_CONSTANTS.DAMPING_RATIO}），绑定至「雪松木料仓拽料」。
            </li>
            <li>
              <strong>Expressive Slider &amp; MaterialSwitch</strong> (<code>SliderTokens.kt</code>{' '}
              / <code>SwitchTokens.kt</code>): 滑块手柄高 {SLIDER_SPEC.HANDLE_HEIGHT_PX}dp、宽度{' '}
              {SLIDER_SPEC.HANDLE_WIDTH_REST_PX}dp→{SLIDER_SPEC.HANDLE_WIDTH_PRESSED_PX}dp、轨道间隙{' '}
              {SLIDER_SPEC.THUMB_TRACK_GAP_PX}dp；开关轨道 {SWITCH_SPEC.TRACK_WIDTH_PX}×
              {SWITCH_SPEC.TRACK_HEIGHT_PX}dp、手柄 {SWITCH_SPEC.UNSELECTED_HANDLE_WITH_ICON_PX}dp→
              {SWITCH_SPEC.PRESSED_HANDLE_WIDTH_PX}dp 搭配 AOSP{' '}
              <code>SpringForce</code>（<code>FastSpatial: ζ=0.6, k=800</code>）实时驱动。
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="font-semibold text-sm" style={{ color: scheme.onSurface }}>
            2. Web 端高保真工程近似
          </h4>
          <ul
            className="list-disc pl-5 text-xs flex flex-col gap-1"
            style={{ color: scheme.onSurfaceVariant }}
          >
            <li>
              使用圆角矩形 / 六角杆 / 圆杆 / 削尖锥 SDF 近似遮罩 + 1px 平滑抗锯齿，并缓存 WebGL2
              uniform 地址消除逐帧查找开销。
            </li>
            <li>
              使用共享离屏 WebGL2 → Canvas2D <code>drawImage</code> 合成，而非 Android{' '}
              <code>RenderNode</code> 运行时着色器。
            </li>
          </ul>
        </div>

        {lastUniformsDebug && (
          <div
            className="rounded-xl p-3 font-mono-tabular text-xs"
            style={{
              backgroundColor: scheme.surfaceContainer,
              color: scheme.onSurface,
            }}
          >
            最近一次 RippleSession 采样：phase={lastUniformsDebug.phase} · computeDelay=
            {lastUniformsDebug.delayMs}ms · maskShape={lastUniformsDebug.maskShape}
          </div>
        )}
      </div>
    </Md3Dialog>
  );
};
