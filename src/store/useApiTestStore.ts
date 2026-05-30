import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ApiEndpoint {
  path: string
  label: string
}

interface ApiTestState {
  p12Path: string
  url: string
  endpoints: ApiEndpoint[]
  selectedApiPath: string
  setP12Path: (path: string) => void
  setUrl: (url: string) => void
  setEndpoints: (endpoints: ApiEndpoint[]) => void
  addEndpoint: (endpoint: ApiEndpoint) => void
  removeEndpoint: (path: string) => void
  setSelectedApiPath: (path: string) => void
  resetEndpoints: () => void
}

export const useApiTestStore = create<ApiTestState>()(
  persist(
    (set, get) => ({
      p12Path: '',
      url: '',
      endpoints: [],
      selectedApiPath: '',

      setP12Path: (p12Path) => set({ p12Path }),
      setUrl: (url) => set({ url }),

      setEndpoints: (endpoints) => {
        const nextSelected = endpoints[0]?.path ?? ''
        set({ endpoints, selectedApiPath: nextSelected })
      },

      addEndpoint: (ep) => set((state) => {
        if (state.endpoints.some((e) => e.path === ep.path)) return {}
        const updated = [...state.endpoints, ep]
        const nextSelected = state.selectedApiPath === '' ? ep.path : state.selectedApiPath
        return { endpoints: updated, selectedApiPath: nextSelected }
      }),

      removeEndpoint: (path) => set((state) => {
        const filtered = state.endpoints.filter((e) => e.path !== path)
        const nextSelected = state.selectedApiPath === path 
          ? (filtered[0]?.path ?? '') 
          : state.selectedApiPath
        return { endpoints: filtered, selectedApiPath: nextSelected }
      }),

      setSelectedApiPath: (selectedApiPath) => set({ selectedApiPath }),

      resetEndpoints: () => set({ 
        endpoints: [], 
        selectedApiPath: '' 
      })
    }),
    { name: 'api-test-settings-v4' } // 競合防止のための新規保存キー
  )
)