import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAlarmStore } from '../store/useAlarmStore'
import { asThresholdValue } from '../types/branded'
import type { AlarmThreshold, DeviceConfig } from '../types/domain'

const FALLBACK_THRESHOLDS: AlarmThreshold[] = [
  {
    plcId: 'melsec-line-a',
    address: 1000,
    label: 'Mitsubishi Line A Furnace Temp',
    unit: 'degC',
    HH: asThresholdValue(2500),
    H: asThresholdValue(2000),
    L: asThresholdValue(500),
    LL: asThresholdValue(200),
  },
]

function configToThresholds(config: DeviceConfig): AlarmThreshold[] {
  return config.signals.map((signal) => {
    const threshold: AlarmThreshold = {
      plcId: signal.plcId,
      address: signal.address,
      label: signal.name,
      unit: signal.unit,
    }
    for (const alert of signal.alerts) {
      if (alert.kind === 'HH') threshold.HH = asThresholdValue(alert.threshold)
      else if (alert.kind === 'H') threshold.H = asThresholdValue(alert.threshold)
      else if (alert.kind === 'L') threshold.L = asThresholdValue(alert.threshold)
      else if (alert.kind === 'LL') threshold.LL = asThresholdValue(alert.threshold)
    }
    return threshold
  })
}

export function useDeviceConfig(): void {
  const setThreshold = useAlarmStore((s) => s.setThreshold)

  useEffect(() => {
    invoke<DeviceConfig>('config_load')
      .then((config) => {
        for (const threshold of configToThresholds(config)) {
          setThreshold(threshold)
        }
      })
      .catch(() => {
        for (const threshold of FALLBACK_THRESHOLDS) {
          setThreshold(threshold)
        }
      })
  }, [setThreshold])
}
