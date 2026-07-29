import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

const EMERGENCIES_LIST = [
  { id: 'heart', name: 'النوبة القلبية', desc: 'التعرف على النوبة والتصرف السريع', icon: '❤️', severityText: 'طوارئ قصوى 🚨', color: 'rgba(239,68,68,0.15)', badgeColor: '#EF4444' },
  { id: 'stroke', name: 'السكتة الدماغية', desc: 'الكشف السريع والتصرف الفوري', icon: '🧠', severityText: 'طوارئ قصوى 🚨', color: 'rgba(239,68,68,0.15)', badgeColor: '#EF4444' },
  { id: 'cpr', name: 'الإنعاش القلبي الرئوي', desc: 'إنقاذ شخص توقف قلبه عن النبض', icon: '📈', severityText: 'طوارئ قصوى 🚨', color: 'rgba(239,68,68,0.15)', badgeColor: '#EF4444' },
  { id: 'bleeding', name: 'النزيف', desc: 'التحكم في النزيف وإيقافه', icon: '🩸', severityText: 'حالة حرجة ⚠️', color: 'rgba(249,115,22,0.15)', badgeColor: '#F97316' },
  { id: 'choking', name: 'الاختناق', desc: 'إزالة الجسم العالق في مجرى الهواء', icon: '💨', severityText: 'حالة حرجة ⚠️', color: 'rgba(249,115,22,0.15)', badgeColor: '#F97316' },
  { id: 'burns', name: 'الحروق', desc: 'إسعاف الحروق وتخفيف الألم', icon: '🔥', severityText: 'حالة متوسطة 🩹', color: 'rgba(251,191,36,0.15)', badgeColor: '#FBBF24' },
  { id: 'fracture', name: 'الكسور', desc: 'تثبيت الكسر وتقليل الأضرار', icon: '🦴', severityText: 'حالة متوسطة 🩹', color: 'rgba(34,197,94,0.15)', badgeColor: '#22C55E' },
]

const DATA = {
  bleeding: {
    title: 'النزيف', icon: '🩸', color: 'rgba(239,68,68,0.15)',
    warning: 'لا تستخدم الرباط الضاغط إلا في حالات النزيف الحاد الذي يهدد الحياة.',
    steps: [
      { title: 'الضغط المباشر', desc: 'اضغط بقوة على الجرح باستخدام قماش نظيف أو ضمادة. استمر في الضغط دون رفع القماش.' },
      { title: 'ارفع الجزء المصاب', desc: 'ارفعه أعلى من مستوى القلب إذا أمكن، هذا يقلل تدفق الدم للمنطقة.' },
      { title: 'لا تزيل القماش', desc: 'إذا نفذ الدم خلال القماش، أضف طبقة فوقه ولا تزيله لأن ذلك يفككّ الجلطة.' },
      { title: 'الرباط الضاغط', desc: 'للنزيف الشديد في الأطراف فقط، استخدم رباطاً ضاغطاً فوق مكان الجرح.' },
      { title: 'اطلب الإسعاف', desc: 'إذا لم يتوقف النزيف خلال 10 دقائق أو كان غزيراً، اتصل بالإسعاف فوراً.' },
    ],
  },
  choking: {
    title: 'الاختناق', icon: '💨', color: 'rgba(249,115,22,0.15)',
    warning: 'للأطفال دون سنتين: ضع الطفل وجهاً للأسفل على ذراعك وأعطه 5 ضربات خفيفة على الظهر.',
    steps: [
      { title: 'اسأل المصاب', desc: 'اسأله: "هل تختنق؟" إذا لم يستطع التكلم أو الكحة بقوة، تصرف فوراً.' },
      { title: '5 ضربات على الظهر', desc: 'أمِل المصاب للأمام وأعطه 5 ضربات قوية بين لوحَي الكتفين بكعب يدك.' },
      { title: '5 ضغطات على البطن', desc: 'قف خلفه، ضع قبضتك فوق السرة، واضغط للداخل وللأعلى بقوة 5 مرات.' },
      { title: 'كرر حتى يخرج الجسم', desc: 'ناوب بين 5 ضربات ظهر و5 ضغطات بطن حتى يخرج الجسم الغريب أو يصل الإسعاف.' },
    ],
  },
  burns: {
    title: 'الحروق', icon: '🔥', color: 'rgba(251,191,36,0.15)',
    warning: 'الحروق الكيميائية تحتاج غسيلاً بالماء لمدة 30 دقيقة. اخلع الملابس الملوثة أولاً.',
    steps: [
      { title: 'أبعد المصدر', desc: 'ابتعد عن مصدر الحرارة فوراً وتأكد من سلامتك.' },
      { title: 'ماء بارد 20 دقيقة', desc: 'اغسل المنطقة المحترقة بماء بارد (ليس ثلجاً) لمدة 20 دقيقة على الأقل.' },
      { title: 'لا معجون أو زيت', desc: 'لا تضع معجون أسنان أو زيت أو أي مادة على الحرق.' },
      { title: 'غطِّ الحرق بضمادة', desc: 'غطّ المنطقة بضمادة نظيفة غير لاصقة. لا تثقب البثور.' },
      { title: 'اطلب الإسعاف', desc: 'للحروق الكبيرة أو العميقة أو على الوجه والمفاصل، اتصل بالإسعاف فوراً.' },
    ],
  },
  heart: {
    title: 'النوبة القلبية', icon: '❤️', color: 'rgba(239,68,68,0.15)',
    warning: 'لا تترك المصاب وحيداً. ابقَ معه حتى وصول الإسعاف.',
    steps: [
      { title: 'الأعراض', desc: 'ألم في الصدر، ضيق تنفس، ألم في الذراع اليسرى أو الفك، تعرق، غثيان.' },
      { title: 'اتصل بـ 1213 فوراً', desc: 'كل دقيقة مهمة. لا تنتظر تحسن الأعراض.' },
      { title: 'اجعله يجلس', desc: 'أجلسه نصف جالس لتخفيف ضغط القلب. أرخِ أي ملابس ضيقة.' },
      { title: 'الأسبرين', desc: 'إذا لم يكن لديه حساسية، أعطه حبة أسبرين (300mg) ليمضغها ببطء.' },
      { title: 'راقب التنفس', desc: 'إذا فقد الوعي وتوقف عن التنفس، ابدأ الإنعاش القلبي الرئوي فوراً.' },
    ],
  },
  cpr: {
    title: 'الإنعاش القلبي الرئوي', icon: '📈', color: 'rgba(124,58,237,0.15)',
    warning: 'إذا لم تكن متدرباً، الضغطات على الصدر فقط (بدون نفس) مقبولة وتساعد.',
    steps: [
      { title: 'تأكد من السلامة', desc: 'ناد المصاب بصوت عالٍ واهزّ كتفيه. إذا لم يستجب، اتصل بـ 1213.' },
      { title: 'ضعه على ظهره', desc: 'على سطح صلب. ضع كعب يدك في منتصف الصدر بين الحلمتين.' },
      { title: '30 ضغطة على الصدر', desc: 'اضغط بعمق 5-6 سم، 100-120 ضغطة في الدقيقة.' },
      { title: 'نفسان إنقاذ', desc: 'أغلق أنف المصاب وأعطه نفسين مدة ثانية لكل نفس.' },
      { title: 'استمر حتى الإسعاف', desc: 'ناوب: 30 ضغطة + نفسان، حتى يستعيد نبضه أو يصل الإسعاف.' },
    ],
  },
  stroke: {
    title: 'السكتة الدماغية', icon: '🧠', color: 'rgba(59,130,246,0.15)',
    warning: 'لا تعطِ الأسبرين في السكتة الدماغية — قد تكون نزيفية والأسبرين يزيدها سوءاً.',
    steps: [
      { title: 'اختبار FAST', desc: 'F: وجه غير متساوٍ؟ A: ذراع تسقط؟ S: تعثر في الكلام؟ T: اتصل فوراً.' },
      { title: 'اتصل بـ 1213 فوراً', desc: 'السكتة طارئة قصوى. كل دقيقة تمر تضر بالمخ.' },
      { title: 'لا طعام أو شرب', desc: 'السكتة تؤثر على البلع. لا تعطه أي طعام أو دواء أو ماء.' },
      { title: 'وضع الاسترداد', desc: 'إذا كان واعياً، أسنده. إذا كان فاقد الوعي ويتنفس، ضعه على جانبه.' },
    ],
  },
  fracture: {
    title: 'الكسور', icon: '🦴', color: 'rgba(34,197,94,0.15)',
    warning: 'لا تحاول تقويم العظم بنفسك. إذا كان الكسر مفتوحاً، غطّه بضمادة نظيفة ولا تضغط.',
    steps: [
      { title: 'لا تحرك المصاب', desc: 'إذا كان هناك احتمال كسر في العمود الفقري أو الرقبة، لا تحرك المصاب.' },
      { title: 'ثبّت العضو المكسور', desc: 'ثبّته في مكانه باستخدام جبيرة أو أي مادة صلبة مناسبة.' },
      { title: 'الثلج للتورم', desc: 'ضع كيس ثلج مغلف بقماش على منطقة الكسر لـ 20 دقيقة كل ساعة.' },
      { title: 'ارفع الطرف', desc: 'ارفع الطرف المصاب أعلى من القلب لتقليل التورم والألم.' },
      { title: 'اطلب الإسعاف', desc: 'للكسور الكبيرة أو المفتوحة أو إذا لم يستطع الحركة، اتصل فوراً.' },
    ],
  },
}

export default function Guide() {
  const { type } = useParams()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  if (type) {
    const data = DATA[type]
    if (!data) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>غير موجود</div>

    return (
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/guide')}>←</button>
          <div>
            <h2 style={styles.headerTitle}>{data.title}</h2>
            <p style={styles.headerSub}>إسعافات أولية</p>
          </div>
        </div>

        <div style={styles.content}>
          {/* Big Icon */}
          <div style={{ ...styles.bigIcon, background: data.color }}>{data.icon}</div>

          {/* Warning */}
          <div style={styles.warningCard}>
            <strong style={{ color: '#F97316' }}>⚠️ تحذير: </strong>{data.warning}
          </div>

          {/* Steps */}
          {data.steps.map((step, i) => (
            <div key={i} style={styles.stepCard}>
              <div style={styles.stepNum}>{i + 1}</div>
              <div>
                <div style={styles.stepTitle}>{step.title}</div>
                <div style={styles.stepDesc}>{step.desc}</div>
              </div>
            </div>
          ))}

          {/* SOS */}
          <div style={styles.sosSection}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#E8192C' }}>⚠️ حالة طوارئ؟</div>
            <div style={{ fontSize: '12px', color: '#9090a8', margin: '4px 0 14px' }}>اتصل بالإسعاف فوراً</div>
            <a href="tel:1213" style={{ textDecoration: 'none' }}>
              <button style={styles.callBtn}>📞 1213 — الإسعاف</button>
            </a>
          </div>
        </div>

        <BottomNav active="guide" />
      </div>
    )
  }

  // Guide List Index Page
  const filteredEmergencies = EMERGENCIES_LIST.filter(emg =>
    emg.name.includes(searchQuery) || emg.desc.includes(searchQuery)
  )

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <div>
          <h2 style={styles.headerTitle}>دليل الإسعافات الأولية 📚</h2>
          <p style={styles.headerSub}>اختر نوع الإصابة لقراءة خطوات الإسعاف</p>
        </div>
      </div>

      <div style={styles.content}>
        {/* Search Bar */}
        <div style={styles.searchBar}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <input
            style={styles.searchInput}
            placeholder="ابحث عن حالة طوارئ..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button style={styles.clearBtn} onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {/* Catalog */}
        <div style={styles.emergenciesList}>
          {filteredEmergencies.length === 0 ? (
            <div style={styles.noResults}>لا توجد نتائج مطابقة، جرب البحث عن كلمة أخرى</div>
          ) : (
            filteredEmergencies.map(emg => (
              <div key={emg.id} style={styles.emgCard} onClick={() => navigate(`/guide/${emg.id}`)}>
                <div style={{ textAlign: 'right', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={styles.emgName}>{emg.name}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                      background: emg.color, color: emg.badgeColor, border: `1px solid ${emg.badgeColor}40`
                    }}>
                      {emg.severityText}
                    </span>
                  </div>
                  <div style={styles.emgDesc}>{emg.desc}</div>
                </div>
                <div style={{ ...styles.emgIcon, background: emg.color }}>{emg.icon}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav active="guide" />
    </div>
  )
}

const styles = {
page: { 
  minHeight: '100vh',
  maxWidth: '550px',
  margin: '0 auto',
  background: '#1a1a1f', 
  fontFamily: 'Cairo, sans-serif', 
  direction: 'rtl', 
  paddingBottom: '80px',
  position: 'relative',
  overflowX: 'hidden',
},  header: { background: '#242429', padding: '50px 16px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #3a3a45' },
  backBtn: { width: '42px', height: '42px', background: '#2e2e35', border: 'none', borderRadius: '14px', fontSize: '20px', cursor: 'pointer', color: '#f0f0f5', flexShrink: 0 },
  headerTitle: { color: '#f0f0f5', fontSize: '22px', fontWeight: 900, margin: 0 },
  headerSub: { color: '#9090a8', fontSize: '13px', margin: '3px 0 0' },
  content: { padding: '20px 16px' },
  bigIcon: { width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto 20px' },
  warningCard: { background: 'rgba(249,115,22,0.1)', border: '1.5px solid rgba(249,115,22,0.3)', borderRadius: '14px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: '#9090a8', lineHeight: 1.6 },
  stepCard: { background: '#242429', borderRadius: '16px', padding: '16px', marginBottom: '12px', display: 'flex', gap: '14px', alignItems: 'flex-start' },
  stepNum: { width: '32px', height: '32px', background: '#E8192C', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px', color: 'white', flexShrink: 0 },
  stepTitle: { fontSize: '15px', fontWeight: 700, color: '#f0f0f5', marginBottom: '4px' },
  stepDesc: { fontSize: '13px', color: '#9090a8', lineHeight: 1.6 },
  sosSection: { background: 'rgba(232,25,44,0.08)', border: '1.5px solid rgba(232,25,44,0.25)', borderRadius: '16px', padding: '16px', textAlign: 'center', marginTop: '8px' },
  callBtn: { background: '#E8192C', color: 'white', border: 'none', borderRadius: '14px', padding: '13px 24px', fontFamily: 'Cairo, sans-serif', fontSize: '16px', fontWeight: 700, cursor: 'pointer', width: '100%' },
  searchBar: { background: '#242429', border: '1.5px solid #3a3a45', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f5', width: '100%', fontSize: '14px', fontFamily: 'Cairo, sans-serif' },
  clearBtn: { background: 'transparent', border: 'none', color: '#9090a8', fontSize: '16px', cursor: 'pointer' },
  emergenciesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  emgCard: { background: '#242429', borderRadius: '18px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1.5px solid transparent', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  emgName: { fontSize: '15px', fontWeight: 800, color: '#f0f0f5' },
  emgDesc: { fontSize: '12px', color: '#9090a8', marginTop: '4px' },
  emgIcon: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 },
  noResults: { color: '#9090a8', textAlign: 'center', padding: '30px 10px', fontSize: '13px', lineHeight: '1.6' },
}