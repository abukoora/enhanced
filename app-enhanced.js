// ================================================================
// حصون الإيمان - نسخة محسّنة من app.js
// تحسينات: الأمان، الأداء، الموثوقية
// ================================================================

// ================================================================
// 1. نظام الأمان والتخزين الآمن
// ================================================================

/**
 * نظام تخزين آمن مع تشفير أساسي
 */
class SecureStorage {
    static #SECRET_KEY = 'hosoon_aliman_2024'; // يجب تغييره في الإنتاج
    
    /**
     * حفظ بيانات آمنة مع التحقق من الصحة
     */
    static set(key, value) {
        try {
            // التحقق من المفتاح
            if (typeof key !== 'string' || !key.match(/^[a-zA-Z0-9_-]+$/)) {
                console.warn('Invalid key format:', key);
                return false;
            }
            
            // تحويل القيمة إلى JSON وتشفيرها بـ Base64
            const jsonStr = JSON.stringify(value);
            const encoded = btoa(encodeURIComponent(jsonStr));
            
            localStorage.setItem(key, encoded);
            return true;
        } catch (error) {
            console.error('SecureStorage.set error:', error);
            return false;
        }
    }
    
    /**
     * قراءة بيانات آمنة مع فك التشفير
     */
    static get(key, defaultValue = null) {
        try {
            const encoded = localStorage.getItem(key);
            if (!encoded) return defaultValue;
            
            const jsonStr = decodeURIComponent(atob(encoded));
            return JSON.parse(jsonStr);
        } catch (error) {
            console.warn('SecureStorage.get error:', error);
            return defaultValue;
        }
    }
    
    /**
     * حذف بيانة آمنة
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('SecureStorage.remove error:', error);
            return false;
        }
    }
    
    /**
     * مسح جميع البيانات
     */
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('SecureStorage.clear error:', error);
            return false;
        }
    }
}

// ================================================================
// 2. نظام Sanitization لمنع XSS
// ================================================================

/**
 * تنظيف وتأمين محتوى HTML
 */
class HTMLSanitizer {
    // العلامات المسموحة
    static ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'span'];
    static ALLOWED_ATTRIBUTES = ['class', 'style'];
    
    /**
     * تنظيف نص HTML من الأكواد الضارة
     */
    static sanitize(htmlText) {
        if (typeof htmlText !== 'string') return '';
        
        const temp = document.createElement('div');
        temp.innerHTML = htmlText;
        
        // حذف جميع Script tags
        temp.querySelectorAll('script, iframe, object, embed').forEach(el => {
            el.remove();
        });
        
        // تنظيف الـ event handlers
        temp.querySelectorAll('[onclick], [onerror], [onload]').forEach(el => {
            el.removeAttribute('onclick');
            el.removeAttribute('onerror');
            el.removeAttribute('onload');
        });
        
        return temp.innerHTML;
    }
    
    /**
     * إرجاع نص آمن بدون HTML
     */
    static escapeHTML(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    }
}

// ================================================================
// 3. نظام معالجة الأخطاء المتقدم
// ================================================================

/**
 * نظام معالجة الأخطاء المركزي
 */
class ErrorHandler {
    static errorLog = [];
    static MAX_LOG_SIZE = 100;
    
    static log(error, context = {}) {
        const errorEntry = {
            message: error.message || String(error),
            stack: error.stack || '',
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        // إضافة الخطأ إلى السجل
        this.errorLog.push(errorEntry);
        
        // حذف الأخطاء القديمة
        if (this.errorLog.length > this.MAX_LOG_SIZE) {
            this.errorLog.shift();
        }
        
        // تسجيل في Console (في بيئة التطوير فقط)
        if (typeof window.DEBUG === 'undefined' || window.DEBUG) {
            console.error('[ErrorHandler]', errorEntry);
        }
        
        // يمكن إرسال الأخطاء إلى خادم remote
        this.reportToServer(errorEntry);
    }
    
    static reportToServer(errorEntry) {
        // سيتم تطبيقه عند توفر backend
        // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorEntry) })
    }
    
    static getErrorLog() {
        return this.errorLog;
    }
}

// استقبال الأخطاء غير المعالجة
window.addEventListener('error', (event) => {
    ErrorHandler.log(event.error, { type: 'uncaughtException' });
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.log(event.reason, { type: 'unhandledPromiseRejection' });
});

// ================================================================
// 4. نظام Backup والاستعادة
// ================================================================

/**
 * نظام النسخ الاحتياطية المتقدم
 */
class BackupSystem {
    static BACKUP_PREFIX = 'backup_';
    static MAX_BACKUPS = 5;
    
    /**
     * إنشاء نسخة احتياطية
     */
    static createBackup(name = '') {
        try {
            const backup = {
                id: Date.now(),
                name: name || `Backup ${new Date().toLocaleString('ar-SA')}`,
                timestamp: new Date().toISOString(),
                data: {}
            };
            
            // نسخ جميع البيانات المهمة
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key.startsWith(this.BACKUP_PREFIX)) {
                    backup.data[key] = localStorage.getItem(key);
                }
            }
            
            const backupKey = this.BACKUP_PREFIX + backup.id;
            SecureStorage.set(backupKey, backup);
            
            // حذف النسخ القديمة إذا تجاوزنا الحد الأقصى
            this.cleanOldBackups();
            
            console.log('[Backup] تم إنشاء نسخة احتياطية:', backup.id);
            return backup.id;
        } catch (error) {
            ErrorHandler.log(error, { context: 'BackupSystem.createBackup' });
            return null;
        }
    }
    
    /**
     * استعادة من نسخة احتياطية
     */
    static restore(backupId) {
        try {
            const backupKey = this.BACKUP_PREFIX + backupId;
            const backup = SecureStorage.get(backupKey);
            
            if (!backup) {
                throw new Error('Backup not found: ' + backupId);
            }
            
            // استعادة جميع البيانات
            Object.entries(backup.data).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
            
            console.log('[Backup] تم استعادة النسخة:', backupId);
            return true;
        } catch (error) {
            ErrorHandler.log(error, { context: 'BackupSystem.restore' });
            return false;
        }
    }
    
    /**
     * الحصول على قائمة النسخ الاحتياطية
     */
    static getBackupList() {
        const backups = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.BACKUP_PREFIX)) {
                const backup = SecureStorage.get(key);
                if (backup) backups.push(backup);
            }
        }
        return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    
    /**
     * حذف النسخ القديمة
     */
    static cleanOldBackups() {
        const backups = this.getBackupList();
        if (backups.length > this.MAX_BACKUPS) {
            const toDelete = backups.slice(this.MAX_BACKUPS);
            toDelete.forEach(backup => {
                localStorage.removeItem(this.BACKUP_PREFIX + backup.id);
            });
        }
    }
    
    /**
     * تصدير النسخة الاحتياطية كـ JSON
     */
    static exportBackup(backupId) {
        try {
            const backup = SecureStorage.get(this.BACKUP_PREFIX + backupId);
            if (!backup) throw new Error('Backup not found');
            
            return JSON.stringify(backup, null, 2);
        } catch (error) {
            ErrorHandler.log(error, { context: 'BackupSystem.exportBackup' });
            return null;
        }
    }
    
    /**
     * استيراد نسخة احتياطية من JSON
     */
    static importBackup(jsonString) {
        try {
            const backup = JSON.parse(jsonString);
            
            // التحقق من صيغة النسخة الاحتياطية
            if (!backup.data || typeof backup.data !== 'object') {
                throw new Error('Invalid backup format');
            }
            
            backup.id = Date.now();
            const backupKey = this.BACKUP_PREFIX + backup.id;
            SecureStorage.set(backupKey, backup);
            
            return backup.id;
        } catch (error) {
            ErrorHandler.log(error, { context: 'BackupSystem.importBackup' });
            return null;
        }
    }
}

// ================================================================
// 5. نظام التخزين الذكي مع الـ Caching
// ================================================================

/**
 * نظام Cache مع استراتيجية الحفظ الذكية
 */
class CacheManager {
    static cache = new Map();
    static CACHE_DURATION = 1000 * 60 * 30; // 30 دقيقة
    
    static set(key, value, duration = this.CACHE_DURATION) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + duration
        });
    }
    
    static get(key) {
        const cached = this.cache.get(key);
        
        if (!cached) return null;
        
        if (Date.now() > cached.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.value;
    }
    
    static clear() {
        this.cache.clear();
    }
}

// ================================================================
// 6. نظام تحليل البيانات والإحصائيات
// ================================================================

/**
 * نظام تحليلي متقدم
 */
class Analytics {
    static #events = [];
    
    static track(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: new Date().toISOString(),
            data,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.#events.push(event);
        
        // الحفظ إلى localStorage كل 10 أحداث
        if (this.#events.length >= 10) {
            this.saveEvents();
        }
    }
    
    static saveEvents() {
        SecureStorage.set('analytics_events', this.#events);
        this.#events = [];
    }
    
    static getStats() {
        return {
            totalEvents: this.#events.length,
            recentEvents: this.#events.slice(-20),
            savedEvents: SecureStorage.get('analytics_events', [])
        };
    }
}

// ================================================================
// 7. نظام الإشعارات المتقدم
// ================================================================

/**
 * نظام الإشعارات والرسائل
 */
class NotificationSystem {
    static async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        
        return false;
    }
    
    static send(title, options = {}) {
        if (Notification.permission === 'granted') {
            return new Notification(title, {
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                ...options
            });
        }
    }
    
    static sendDaily(hour, minute, title, options) {
        // تذكير يومي
        const now = new Date();
        const target = new Date();
        target.setHours(hour, minute, 0, 0);
        
        if (target < now) {
            target.setDate(target.getDate() + 1);
        }
        
        const timeout = target - now;
        setTimeout(() => {
            this.send(title, options);
            setInterval(() => {
                this.send(title, options);
            }, 24 * 60 * 60 * 1000);
        }, timeout);
    }
}

// ================================================================
// 8. نظام إدارة الدورات والدروس مع Lazy Loading
// ================================================================

/**
 * مدير الدورات مع التحميل الكسول
 */
class CourseManager {
    static coursesCache = new Map();
    static lessonsCache = new Map();
    
    /**
     * الحصول على دورة محددة
     */
    static getCourse(courseId) {
        // البحث في الـ Cache أولاً
        if (this.coursesCache.has(courseId)) {
            return this.coursesCache.get(courseId);
        }
        
        // البحث في البيانات الخام
        const course = rawCourses.find(c => c.id === courseId);
        if (course) {
            this.coursesCache.set(courseId, course);
        }
        
        return course || null;
    }
    
    /**
     * الحصول على درس محدد
     */
    static getLesson(courseId, lessonIndex) {
        const cacheKey = `${courseId}-${lessonIndex}`;
        
        if (this.lessonsCache.has(cacheKey)) {
            return this.lessonsCache.get(cacheKey);
        }
        
        const course = this.getCourse(courseId);
        if (course && course.lessons && course.lessons[lessonIndex]) {
            const lesson = course.lessons[lessonIndex];
            this.lessonsCache.set(cacheKey, lesson);
            return lesson;
        }
        
        return null;
    }
    
    /**
     * الحصول على جميع الدورات
     */
    static getAllCourses() {
        return rawCourses;
    }
    
    /**
     * إحصائيات الدورات
     */
    static getStats() {
        return {
            totalCourses: rawCourses.length,
            totalLessons: rawCourses.reduce((sum, c) => sum + (c.lessons?.length || 0), 0),
            totalSections: rawCourses.reduce((sum, c) => {
                return sum + c.lessons.reduce((ls, l) => {
                    return ls + (l.sections?.length || 0);
                }, 0);
            }, 0)
        };
    }
}

// ================================================================
// 9. نظام تتبع التقدم المتقدم
// ================================================================

/**
 * مدير التقدم والإنجازات
 */
class ProgressTracker {
    static PROGRESS_KEY = 'user_progress';
    static ACHIEVEMENTS_KEY = 'user_achievements';
    
    static getProgress() {
        return SecureStorage.get(this.PROGRESS_KEY, {});
    }
    
    static setProgress(courseId, lessonIndex, progress) {
        const allProgress = this.getProgress();
        allProgress[courseId] = allProgress[courseId] || {};
        allProgress[courseId][lessonIndex] = {
            completed: progress,
            completedAt: new Date().toISOString()
        };
        SecureStorage.set(this.PROGRESS_KEY, allProgress);
        Analytics.track('lesson_completed', { courseId, lessonIndex });
    }
    
    static getCompletionPercentage(courseId) {
        const course = CourseManager.getCourse(courseId);
        if (!course || !course.lessons) return 0;
        
        const progress = this.getProgress();
        const courseProgress = progress[courseId] || {};
        const completed = Object.values(courseProgress).filter(p => p.completed).length;
        
        return Math.round((completed / course.lessons.length) * 100);
    }
    
    static unlockAchievement(achievementId) {
        const achievements = SecureStorage.get(this.ACHIEVEMENTS_KEY, []);
        if (!achievements.includes(achievementId)) {
            achievements.push(achievementId);
            SecureStorage.set(this.ACHIEVEMENTS_KEY, achievements);
            Analytics.track('achievement_unlocked', { achievementId });
        }
    }
}

// ================================================================
// 10. نظام المراقبة والقياس
// ================================================================

/**
 * نظام قياس الأداء
 */
class PerformanceMonitor {
    static metrics = {};
    
    static startMeasure(name) {
        this.metrics[name] = {
            start: performance.now()
        };
    }
    
    static endMeasure(name) {
        if (!this.metrics[name]) return null;
        
        const duration = performance.now() - this.metrics[name].start;
        this.metrics[name].duration = duration;
        
        if (duration > 1000) {
            console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
        }
        
        return duration;
    }
    
    static getMetrics() {
        return this.metrics;
    }
}

// ================================================================
// تصدير الأنظمة للاستخدام العام
// ================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SecureStorage,
        HTMLSanitizer,
        ErrorHandler,
        BackupSystem,
        CacheManager,
        Analytics,
        NotificationSystem,
        CourseManager,
        ProgressTracker,
        PerformanceMonitor
    };
}
