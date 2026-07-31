'use client'

import { useEffect } from 'react'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'

/**
 * 卡牌系统初始化组件
 * 在客户端挂载后初始化卡牌系统
 */
export function CardSystemInitializer() {
    const initializeSystem = useUnifiedCardStore(state => state.initializeSystem)

    useEffect(() => {
        let isMounted = true

        const initializeCardSystem = async () => {
            if (typeof window === 'undefined') {
                return
            }

            try {
                const result = await initializeSystem()

                if (!result.initialized) {
                    console.error('[CardSystemInitializer] 卡牌系统初始化失败')
                    return
                }

                if (isMounted) {
                    // 保留现有调试入口；初始化本身由 store 的并发 Promise 统一管理。
                    (window as any).unifiedCardStore = useUnifiedCardStore.getState()
                }
            } catch (error) {
                console.error('[CardSystemInitializer] 卡牌系统初始化失败:', error)
            }
        }

        void initializeCardSystem()

        return () => {
            isMounted = false
        }
    }, [initializeSystem])

    return null
}
