interface SnapPayOptions {
  onSuccess?: (result: any) => void
  onPending?: (result: any) => void
  onError?: (result: any) => void
  onClose?: () => void
}

interface Snap {
  pay: (token: string, options?: SnapPayOptions) => void
}

declare global {
  interface Window {
    snap: Snap
  }
}

export {}
