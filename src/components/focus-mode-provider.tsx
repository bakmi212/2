'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'

interface FocusModeContextType {
  isFocusMode: boolean
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (value: boolean) => void
  confirmNavigation: () => Promise<boolean>
  backPath: string | null
}

const FocusModeContext = createContext<FocusModeContextType>({
  isFocusMode: false,
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
  confirmNavigation: async () => true,
  backPath: null,
})

export function useFocusMode() {
  return useContext(FocusModeContext)
}

// Paths that trigger focus mode
const FOCUS_MODE_PATHS = [
  '/admin/products/new',
  '/dashboard/admin/products/new',
]

const FOCUS_MODE_PATTERNS = [
  /\/admin\/products\/[^/]+\/edit$/,
  /\/admin\/products\/[^/]+\/builder$/,
  /\/dashboard\/admin\/products\/[^/]+\/edit$/,
]

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Check if current path should use focus mode
  const isFocusMode = FOCUS_MODE_PATHS.some((p) => pathname === p) ||
    FOCUS_MODE_PATTERNS.some((pattern) => pattern.test(pathname))

  // Determine back path based on current location
  const getBackPath = (): string | null => {
    if (pathname === '/admin/products/new' || pathname === '/dashboard/admin/products/new') {
      return '/admin/products'
    }
    if (pathname.includes('/edit')) {
      // Go to product detail or products list
      const productId = pathname.split('/')[3]
      return `/admin/products/${productId}/builder`
    }
    if (pathname.includes('/builder')) {
      return '/admin/products'
    }
    return '/admin/products'
  }

  const backPath = isFocusMode ? getBackPath() : null

  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) return true
    return new Promise((resolve) => {
      setPendingNavigation(null)
      setShowConfirmDialog(true)
      // Store resolve to call later
      ;(window as any).__navigationResolve = resolve
    })
  }, [hasUnsavedChanges])

  const handleStay = () => {
    setShowConfirmDialog(false)
    if ((window as any).__navigationResolve) {
      (window as any).__navigationResolve(false)
    }
  }

  const handleLeave = () => {
    setShowConfirmDialog(false)
    setHasUnsavedChanges(false)
    if ((window as any).__navigationResolve) {
      (window as any).__navigationResolve(true)
    }
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  // Handle browser back button
  useEffect(() => {
    if (!isFocusMode) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isFocusMode, hasUnsavedChanges])

  return (
    <FocusModeContext.Provider
      value={{
        isFocusMode,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        confirmNavigation,
        backPath,
      }}
    >
      {children}
      {showConfirmDialog && (
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                Your changes have not been saved. Are you sure you want to leave?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleStay}>Stay on Page</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeave}>Leave Without Saving</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </FocusModeContext.Provider>
  )
}
