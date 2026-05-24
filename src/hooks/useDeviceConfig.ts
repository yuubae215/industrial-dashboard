import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useSignalConfigStore } from '../store/useSignalConfigStore'
import { asThresholdValue } from '../types/branded'
import type { SignalConfig } from '../store/useSignalConfigStore'
import type { DeviceConfig } from '../types/domain'

function configToSignalConfigs(config: DeviceConfig): SignalConfig[] {
  return config.signals.map((signal) => {
    const sc: SignalConfig = {
      plcId: signal.plcId,
      address: signal.address,
      label: signal.name,
      unit: signal.unit,
    }
    for (const alert of signal.alerts) {
      if (alert.kind === 'HH') sc.HH = asThresholdValue(alert.threshold)
      else if (alert.kind === 'H') sc.H = asThresholdValue(alert.threshold)
      else if (alert.kind === 'L') sc.L = asThresholdValue(alert.threshold)
      else if (alert.kind === 'LL') sc.LL = asThresholdValue(alert.threshold)
    }
    return sc
  })
}

export function useDeviceConfig(): void {
  const setSignalConfig = useSignalConfigStore((s) => s.setSignalConfig)

  useEffect(() => {
    invoke<DeviceConfig>('config_load')
      .then((config) => {
        for (const sc of configToSignalConfigs(config)) {
          setSignalConfig(sc)
        }
      })
      .catch(() => {
        // config ファイルが存在しない場合は何もしない（ユーザーが手動で設定）
      })
  }, [setSignalConfig])
}
