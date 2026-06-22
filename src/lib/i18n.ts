'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

interface I18nCtxType {
  lang: string
  t: (key: string, section?: string) => string
  setLang: (lang: string) => void
  loading: boolean
}

const I18nCtx = createContext<I18nCtxType>({ lang: 'en', t: () => '', setLang: () => {}, loading: true })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState('en')
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    const detectLang = () => {
      const saved = localStorage.getItem('lang')
      if (saved) return saved
      const browser = navigator.language.toLowerCase()
      if (browser.startsWith('id')) return 'id'
      return 'en'
    }
    setLangState(detectLang())
  }, [])

  useEffect(() => {
    const fetchTranslations = async () => {
      const { data } = await supabase.from('translations').select('key, lang, value, section')
      const map: Record<string, Record<string, string>> = {}
      data?.forEach((row: any) => {
        if (!map[row.section]) map[row.section] = {}
        map[row.section][`${row.key}_${row.lang}`] = row.value
      })
      setTranslations(map)
      setLoading(false)
    }
    fetchTranslations()
  }, [supabase])

  const setLang = useCallback(async (newLang: string) => {
    setLangState(newLang)
    localStorage.setItem('lang', newLang)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ language: newLang }).eq('user_id', user.id)
    }
  }, [supabase])

  const t = useCallback((key: string, section: string = 'general') => {
    const value = translations[section]?.[`${key}_${lang}`]
    if (value) return value
    return translations[section]?.[`${key}_en`] || key
  }, [translations, lang])

  const ctxValue = { lang: lang, t: t, setLang: setLang, loading: loading }
  return React.createElement(I18nCtx.Provider, { value: ctxValue }, children)
}

export function useI18n() {
  return useContext(I18nCtx)
}
