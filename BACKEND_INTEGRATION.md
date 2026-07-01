# 🔌 دليل تكامل Backend و Database
## حصون الإيمان مع Supabase و PostgreSQL

---

## 📚 المحتويات

1. [إعداد Supabase](#إعداد-supabase)
2. [تصميم قاعدة البيانات](#تصميم-db)
3. [نظام المصادقة](#المصادقة)
4. [استدعاءات API](#api)
5. [سياسات RLS](#rls)
6. [أمثلة عملية](#أمثلة)

---

## <a id="إعداد-supabase"></a>1. إعداد Supabase

### الخطوة 1: إنشاء حساب Supabase

```bash
# اذهب إلى supabase.com
# سجل دخولاً جديداً
# أنشئ project جديد
```

### الخطوة 2: الحصول على المفاتيح

```javascript
// في ملف config.js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-public-anon-key';

// استيراد Supabase JS
import { createClient } from '@supabase/supabase-js';

// إنشاء عميل Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;
```

### الخطوة 3: تثبيت مكتبة Supabase

```bash
npm install @supabase/supabase-js
```

---

## <a id="تصميم-db"></a>2. تصميم قاعدة البيانات

### الجداول الأساسية

```sql
-- ============================================
-- جدول المستخدمين
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  date_of_birth DATE,
  avatar_url TEXT,
  phone VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- جدول الدورات
-- ============================================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  category VARCHAR(100),
  level VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  total_lessons INTEGER,
  duration_days INTEGER,
  difficulty_score DECIMAL(2,1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_published BOOLEAN DEFAULT true
);

-- ============================================
-- جدول الدروس
-- ============================================
CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  lesson_number INTEGER,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  duration_minutes INTEGER,
  video_url TEXT,
  resources_url TEXT,
  difficulty_score DECIMAL(2,1),
  learning_objectives TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- جدول التقدم
-- ============================================
CREATE TABLE progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  completion_percentage DECIMAL(5,2),
  completed_at TIMESTAMP,
  time_spent_minutes INTEGER,
  quiz_score DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id, lesson_id)
);

-- ============================================
-- جدول الإنجازات والشارات
-- ============================================
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_color VARCHAR(7),
  unlock_criteria TEXT,
  points INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- جدول إنجازات المستخدم
-- ============================================
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- جدول الاختبارات والكويزات
-- ============================================
CREATE TABLE quizzes (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255),
  total_questions INTEGER,
  passing_score DECIMAL(5,2),
  time_limit_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- جدول أسئلة الكويزات
-- ============================================
CREATE TABLE quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  correct_answer TEXT,
  options JSONB,
  points INTEGER,
  explanation TEXT,
  order_number INTEGER
);

-- ============================================
-- جدول إجابات المستخدم على الكويزات
-- ============================================
CREATE TABLE quiz_responses (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- جدول الإشعارات
-- ============================================
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50) CHECK (type IN ('achievement', 'reminder', 'update', 'announcement')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- جدول التعليقات والملاحظات
-- ============================================
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- جدول السجل الدراسي
-- ============================================
CREATE TABLE study_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id),
  date DATE,
  study_duration_minutes INTEGER,
  lessons_completed INTEGER,
  quiz_attempts INTEGER,
  average_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### الفهارس والأداء

```sql
-- فهارس مهمة للأداء
CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_progress_course_id ON progress(course_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_quiz_lesson_id ON quizzes(lesson_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_comments_lesson_id ON comments(lesson_id);
CREATE INDEX idx_study_logs_user_id ON study_logs(user_id);

-- فهارس للبحث
CREATE INDEX idx_courses_title ON courses USING GIN(to_tsvector('arabic', title));
CREATE INDEX idx_lessons_title ON lessons USING GIN(to_tsvector('arabic', title));
```

---

## <a id="المصادقة"></a>3. نظام المصادقة

### أ) تسجيل مستخدم جديد

```javascript
class AuthService {
    /**
     * تسجيل مستخدم جديد
     */
    static async signup(email, password, userData = {}) {
        try {
            // تسجيل في auth
            const { data: authData, error: authError } = 
                await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { gender: userData.gender }
                    }
                });
            
            if (authError) throw authError;
            
            // إنشاء ملف المستخدم
            const { data: userData2, error: userError } = 
                await supabase
                    .from('users')
                    .insert([{
                        auth_id: authData.user.id,
                        email,
                        full_name: userData.fullName,
                        gender: userData.gender,
                        country: userData.country
                    }])
                    .select();
            
            if (userError) throw userError;
            
            return { success: true, data: userData2[0] };
        } catch (error) {
            ErrorHandler.log(error, { context: 'AuthService.signup' });
            return { success: false, error: error.message };
        }
    }
    
    /**
     * تسجيل دخول
     */
    static async signin(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            // تحديث آخر تسجيل دخول
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('auth_id', data.user.id);
            
            return { success: true, data };
        } catch (error) {
            ErrorHandler.log(error, { context: 'AuthService.signin' });
            return { success: false, error: error.message };
        }
    }
    
    /**
     * تسجيل خروج
     */
    static async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            ErrorHandler.log(error, { context: 'AuthService.logout' });
            return { success: false, error: error.message };
        }
    }
    
    /**
     * الحصول على المستخدم الحالي
     */
    static async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) return null;
            
            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', user.id)
                .single();
            
            return data;
        } catch (error) {
            console.warn('No user found');
            return null;
        }
    }
    
    /**
     * استرجاع كلمة المرور
     */
    static async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            ErrorHandler.log(error, { context: 'AuthService.resetPassword' });
            return { success: false, error: error.message };
        }
    }
}
```

---

## <a id="api"></a>4. استدعاءات API

### أ) نظام إدارة الدورات

```javascript
class CourseAPI {
    /**
     * جلب جميع الدورات
     */
    static async getAllCourses() {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('is_published', true)
                .order('id', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (error) {
            ErrorHandler.log(error, { context: 'CourseAPI.getAllCourses' });
            return [];
        }
    }
    
    /**
     * جلب دورة محددة مع دروسها
     */
    static async getCourseWithLessons(courseId) {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select(`
                    *,
                    lessons (
                        id,
                        lesson_number,
                        title,
                        duration_minutes
                    )
                `)
                .eq('id', courseId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            ErrorHandler.log(error, { context: 'CourseAPI.getCourseWithLessons' });
            return null;
        }
    }
    
    /**
     * جلب درس محدد مع محتوياته
     */
    static async getLesson(lessonId) {
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select(`
                    *,
                    quizzes (*)
                `)
                .eq('id', lessonId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            ErrorHandler.log(error, { context: 'CourseAPI.getLesson' });
            return null;
        }
    }
}
```

### ب) نظام إدارة التقدم

```javascript
class ProgressAPI {
    /**
     * تسجيل تقدم درس
     */
    static async recordProgress(userId, courseId, lessonId, progress) {
        try {
            const { data, error } = await supabase
                .from('progress')
                .upsert({
                    user_id: userId,
                    course_id: courseId,
                    lesson_id: lessonId,
                    completion_percentage: progress.percentage,
                    time_spent_minutes: progress.timeSpent,
                    quiz_score: progress.quizScore,
                    completed_at: progress.percentage === 100 ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,course_id,lesson_id'
                })
                .select();
            
            if (error) throw error;
            
            Analytics.track('progress_recorded', {
                courseId,
                lessonId,
                progress: progress.percentage
            });
            
            return data[0];
        } catch (error) {
            ErrorHandler.log(error, { context: 'ProgressAPI.recordProgress' });
            return null;
        }
    }
    
    /**
     * جلب تقدم المستخدم في دورة محددة
     */
    static async getCourseProgress(userId, courseId) {
        try {
            const { data, error } = await supabase
                .from('progress')
                .select('*')
                .eq('user_id', userId)
                .eq('course_id', courseId);
            
            if (error) throw error;
            
            // حساب النسبة الإجمالية
            const totalCompletion = data.length > 0
                ? Math.round(data.reduce((sum, p) => sum + p.completion_percentage, 0) / data.length)
                : 0;
            
            return { lessons: data, totalCompletion };
        } catch (error) {
            ErrorHandler.log(error, { context: 'ProgressAPI.getCourseProgress' });
            return { lessons: [], totalCompletion: 0 };
        }
    }
    
    /**
     * جلب إحصائيات المستخدم
     */
    static async getUserStats(userId) {
        try {
            const { data, error } = await supabase
                .from('progress')
                .select('course_id, completion_percentage, time_spent_minutes')
                .eq('user_id', userId);
            
            if (error) throw error;
            
            const stats = {
                totalCoursesStarted: new Set(data.map(p => p.course_id)).size,
                totalCoursesCompleted: data.filter(p => p.completion_percentage === 100).length,
                totalTimeSpent: data.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0),
                averageCompletion: Math.round(
                    data.reduce((sum, p) => sum + p.completion_percentage, 0) / data.length
                )
            };
            
            return stats;
        } catch (error) {
            ErrorHandler.log(error, { context: 'ProgressAPI.getUserStats' });
            return null;
        }
    }
}
```

### ج) نظام الإنجازات

```javascript
class AchievementAPI {
    /**
     * جلب الإنجازات المتاحة
     */
    static async getAllAchievements() {
        try {
            const { data, error } = await supabase
                .from('achievements')
                .select('*')
                .order('points', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (error) {
            ErrorHandler.log(error, { context: 'AchievementAPI.getAllAchievements' });
            return [];
        }
    }
    
    /**
     * جلب إنجازات المستخدم
     */
    static async getUserAchievements(userId) {
        try {
            const { data, error } = await supabase
                .from('user_achievements')
                .select(`
                    achievement_id,
                    unlocked_at,
                    achievements (*)
                `)
                .eq('user_id', userId);
            
            if (error) throw error;
            return data;
        } catch (error) {
            ErrorHandler.log(error, { context: 'AchievementAPI.getUserAchievements' });
            return [];
        }
    }
    
    /**
     * فتح إنجاز جديد
     */
    static async unlockAchievement(userId, achievementId) {
        try {
            const { data, error } = await supabase
                .from('user_achievements')
                .insert({
                    user_id: userId,
                    achievement_id: achievementId
                })
                .select();
            
            if (error && !error.message.includes('duplicate')) throw error;
            
            Analytics.track('achievement_unlocked', { achievementId });
            return true;
        } catch (error) {
            ErrorHandler.log(error, { context: 'AchievementAPI.unlockAchievement' });
            return false;
        }
    }
}
```

---

## <a id="rls"></a>5. سياسات RLS (Row Level Security)

### إعدادات سياسات الأمان

```sql
-- ============================================
-- تفعيل RLS على الجداول
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- سياسات جدول users
-- ============================================

-- المستخدمون يمكنهم رؤية بيانات أنفسهم فقط
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_id);

-- المستخدمون يمكنهم تحديث بيانات أنفسهم فقط
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_id);

-- الدورات عامة (يمكن لأي شخص قراءتها)
CREATE POLICY "Courses are public"
  ON courses FOR SELECT
  USING (true);

-- ============================================
-- سياسات جدول progress
-- ============================================

-- كل مستخدم يرى تقدمه فقط
CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- كل مستخدم يمكنه تسجيل تقدمه فقط
CREATE POLICY "Users can record own progress"
  ON progress FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- كل مستخدم يمكنه تحديث تقدمه فقط
CREATE POLICY "Users can update own progress"
  ON progress FOR UPDATE
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- ============================================
-- سياسات جدول user_achievements
-- ============================================

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- ============================================
-- سياسات جدول notifications
-- ============================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- ============================================
-- سياسات جدول quiz_responses
-- ============================================

CREATE POLICY "Users can view own quiz responses"
  ON quiz_responses FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Users can submit quiz responses"
  ON quiz_responses FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));
```

---

## <a id="أمثلة"></a>6. أمثلة عملية

### مثال 1: تسجيل مستخدم جديد وحفظ البيانات

```javascript
async function handleSignup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    const gender = document.getElementById('gender').value;
    
    const result = await AuthService.signup(email, password, {
        fullName,
        gender
    });
    
    if (result.success) {
        showModal('تم إنشاء الحساب بنجاح!');
        window.location.href = '/dashboard';
    } else {
        showErrorModal(result.error);
    }
}
```

### مثال 2: تسجيل تقدم درس

```javascript
async function completeLessonAndSave(courseId, lessonId, quizScore) {
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
        showModal('يرجى تسجيل الدخول أولاً');
        return;
    }
    
    const progress = await ProgressAPI.recordProgress(
        user.id,
        courseId,
        lessonId,
        {
            percentage: 100,
            timeSpent: calculateTimeSpent(),
            quizScore
        }
    );
    
    if (progress) {
        showSuccessModal('تم حفظ التقدم بنجاح!');
        
        // فتح الإنجازات
        await checkAndUnlockAchievements(user.id, courseId);
    }
}
```

### مثال 3: عرض لوحة المستخدم

```javascript
async function loadUserDashboard() {
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
        window.location.href = '/login';
        return;
    }
    
    const stats = await ProgressAPI.getUserStats(user.id);
    const achievements = await AchievementAPI.getUserAchievements(user.id);
    
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('totalCourses').textContent = stats.totalCoursesStarted;
    document.getElementById('totalTime').textContent = `${Math.round(stats.totalTimeSpent / 60)} ساعة`;
    document.getElementById('achievements').textContent = achievements.length;
    
    // عرض الإنجازات
    achievements.forEach(achievement => {
        const badge = createBadgeElement(achievement.achievements);
        document.getElementById('badges').appendChild(badge);
    });
}
```

---

## 🔐 نصائح الأمان

```javascript
// 1. استخدم تصفية البيانات
const sanitizedInput = HTMLSanitizer.sanitize(userInput);

// 2. حافظ على الأسرار
const config = {
    SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
    SUPABASE_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY
};

// 3. تحقق من الأذونات
if (!user || !user.auth_id) {
    throw new Error('Unauthorized access');
}

// 4. سجل العمليات المهمة
Analytics.track('user_action', { action: 'course_completed', courseId });
```

---

## 📊 استعلامات مفيدة

```sql
-- أكثر الدورات إكمالاً
SELECT c.title, COUNT(p.id) as completed_count
FROM courses c
LEFT JOIN progress p ON c.id = p.course_id AND p.completion_percentage = 100
GROUP BY c.id
ORDER BY completed_count DESC;

-- المستخدمون الأكثر نشاطاً
SELECT u.full_name, COUNT(p.id) as lessons_completed, SUM(p.time_spent_minutes) as total_time
FROM users u
LEFT JOIN progress p ON u.id = p.user_id
GROUP BY u.id
ORDER BY total_time DESC
LIMIT 10;

-- الإنجازات الأكثر فتحاً
SELECT a.title, COUNT(ua.id) as unlock_count
FROM achievements a
LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
GROUP BY a.id
ORDER BY unlock_count DESC;
```

---

## 🎯 الخطوات التالية

1. ✅ إنشاء جميع الجداول
2. ✅ تطبيق سياسات RLS
3. ✅ اختبار الاتصالات
4. ✅ توثيق API
5. ✅ تطبيق Error Handling
6. ✅ إعداد النسخ الاحتياطية

