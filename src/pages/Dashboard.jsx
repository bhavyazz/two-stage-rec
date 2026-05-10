import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { getUserEmail } from '../auth'
import {
  UserIcon,
  NutritionIcon,
  ReceiptIcon,
  PantryIcon
} from '../components/Icons'

const features = [
  {
    key: 'profiles',
    title: 'User Profiles',
    desc: 'Secure, consolidated provider and patient profiles.',
    icon: <UserIcon />,
    learnContent: {
      title: 'User Profiles - Quick Guide',
      overview: 'Manage and organize healthcare profiles for yourself and your patients or family members in one secure place.',
      sections: [
        {
          heading: 'What You Can Do',
          content: 'View all your profiles, add new profiles, edit profile information, manage profile photos and personal details, track profile history.'
        },
        {
          heading: 'Key Features',
          content: 'Secure authentication per profile, role-based access control, personal health information storage, profile separation for privacy, easy profile switching.'
        },
        {
          heading: 'How to Use',
          content: '1. Click on a profile to view details\n2. Use "Add New Profile" to create additional profiles\n3. Edit your information anytime\n4. Switch between profiles with the dropdown menu\n5. All data is encrypted and stored securely'
        },
        {
          heading: 'Best Practices',
          content: 'Keep your contact information up to date, use strong passwords for each profile, regularly review your profile details, store accurate health history for better recommendations.'
        }
      ]
    }
  },
  {
    key: 'nutrition',
    title: 'Nutrition Tracker',
    desc: 'Track dietary data and nutrition summaries.',
    icon: <NutritionIcon />,
    learnContent: {
      title: 'Nutrition Tracker - Complete Guide',
      overview: 'Log your meals, track macronutrients, get AI-powered nutrition coaching, and achieve your health goals.',
      sections: [
        {
          heading: 'What You Can Do',
          content: 'Log daily food entries with calorie data, track protein, carbs, and fats, view nutrition insights and trends, get personalized AI coaching, receive daily nutrition tips, set and monitor health goals.'
        },
        {
          heading: 'Key Features',
          content: 'Real-time nutrition search and food database, macronutrient breakdown charts, historical insights and trends, AI-powered nutrition analysis, personalized meal suggestions, daily coaching tips, health grade assessment.'
        },
        {
          heading: 'How to Use',
          content: '1. Go to Nutrition Tracker page\n2. Click "Add Food Entry"\n3. Search for your food item\n4. Enter quantity and unit\n5. Preview nutrition info\n6. Save the entry\n7. View insights tab for analysis\n8. Check coach tab for AI recommendations'
        },
        {
          heading: 'Pro Tips',
          content: 'Log meals immediately after eating for accuracy, use the search function to find pre-calculated foods, review insights regularly to track progress, check daily tips for personalized coaching, analyze trends over weeks/months for better understanding.'
        }
      ]
    }
  },
  {
    key: 'scanner',
    title: 'Receipt Scanner',
    desc: 'Scan receipts and extract medication or billing info.',
    icon: <ReceiptIcon />,
    learnContent: {
      title: 'Receipt Scanner - How It Works',
      overview: 'Use your camera to capture receipts, extract key information automatically, and organize your data.',
      sections: [
        {
          heading: 'What You Can Do',
          content: 'Scan receipts with your device camera, extract medication information, capture billing details, organize scanned data, search through your receipt history.'
        },
        {
          heading: 'Key Features',
          content: 'OCR technology for accurate text extraction, automatic data structuring, receipt history and search, medication recognition, cost tracking, organized filing system.'
        },
        {
          heading: 'How to Use',
          content: '1. Go to Receipt Scanner page\n2. Click "Scan New Receipt"\n3. Point camera at receipt\n4. Capture clear image\n5. Review extracted data\n6. Edit if needed\n7. Save to history\n8. Search anytime via receipt tab'
        },
        {
          heading: 'Best Practices',
          content: 'Ensure good lighting when scanning, keep receipts flat for better accuracy, scan receipts within 24 hours while details are fresh, review extracted data for accuracy, organize receipts by category or date.'
        }
      ]
    }
  },
  {
    key: 'pantry',
    title: 'Pantry',
    desc: 'View stored pantry items and add more.',
    icon: <PantryIcon />,
    learnContent: {
      title: 'Pantry - Manage Your Items',
      overview: 'Keep track of ingredients and items in your pantry, manage inventory, and plan meals based on what you have.',
      sections: [
        {
          heading: 'What You Can Do',
          content: 'View all pantry items, add new items with quantities, update item quantities, remove expired items, search for specific items, organize by categories, track expiration dates.'
        },
        {
          heading: 'Key Features',
          content: 'Item inventory management, quantity tracking, expiration date alerts, category organization, search functionality, add items from nutrition logs, sync with meal planning.'
        },
        {
          heading: 'How to Use',
          content: '1. Go to Pantry page\n2. View all your stored items\n3. Click "Add Item" to add new items\n4. Enter item name, quantity, and expiration date\n5. Assign category (produce, dairy, grains, etc)\n6. Update quantities as you use items\n7. Remove items when depleted'
        },
        {
          heading: 'Pro Tips',
          content: 'Add items immediately when you shop, set expiration dates to avoid waste, use categories to find items quickly, check pantry before grocery shopping, sync with nutrition tracker to use items in meals.'
        }
      ]
    }
  }
]

export default function Dashboard() {
  const email = getUserEmail()
  const navigate = useNavigate()
  const [selectedLearn, setSelectedLearn] = useState(null)

  return (
    <div>
      <NavBar />

      <main className="container">
        <div className="stack">
          <section className="card wide" style={{overflow:'hidden', position:'relative'}}>
            <div style={{position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(circle at 20% 20%, rgba(92,225,230,0.18), transparent 35%), radial-gradient(circle at 80% 0%, rgba(166,108,255,0.24), transparent 32%)'}}></div>
            <div style={{display:'flex',flexWrap:'wrap',gap:22,alignItems:'flex-start',justifyContent:'space-between',position:'relative',zIndex:1}}>
              <div style={{maxWidth:620}}
              >
                <div className="pill">Healthcare Control Center</div>
                <h1 style={{ margin: '12px 0 10px 0', fontSize: 34, lineHeight: 1.25 }}>Welcome back, {email || 'clinician'}.</h1>
                <p className="muted" style={{margin:'0 0 16px 0', maxWidth:640}}>
                  Coordinate pantry, nutrition, substitutions, profiles, and scanning in one calm workspace. Everything stays secure, organized, and easy to reach.
                </p>
                <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                  <button className="btn primary" style={{boxShadow:'0 18px 38px rgba(92,225,230,0.32)', padding:'12px 18px'}} onClick={()=>navigate('/substitution')}>
                    Start a substitution
                  </button>
                  <button className="btn" style={{padding:'12px 16px'}} onClick={()=>navigate('/pantry')}>
                    Open pantry
                  </button>
                </div>
              </div>
              <div style={{minWidth:220, textAlign:'right', display:'flex', flexDirection:'column', gap:10}}>
                <div className="pill" style={{alignSelf:'flex-end'}}>Trustworthy • Secure • Calm</div>
                <div className="muted small">Dashboard · Pantry · Nutrition · Scanner · Substitutions</div>
              </div>
            </div>
          </section>

          <section className="feature-grid">
            {features.map((f) => (
              <article key={f.key} className="card feature-card" style={{cursor:'pointer'}}>
                <div className="feature-top">
                  <div className="icon-wrap">{f.icon}</div>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize:18 }}>{f.title}</h3>
                    <p
                      className="muted"
                      style={{ margin: 0, fontSize: 14, lineHeight:1.5 }}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="btn primary"
                    onClick={() => {
                      if (f.key === 'profiles') navigate('/profiles')
                      if (f.key === 'nutrition') navigate('/nutrition')
                      if (f.key === 'scanner') navigate('/scanner')
                      if (f.key === 'pantry') navigate('/pantry')
                    }}
                  >
                    Open
                  </button>

                  <button className="btn" onClick={(e) => {
                    e.stopPropagation()
                    setSelectedLearn(f)
                  }} style={{ marginLeft: 8 }}>
                    Learn
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>

      {/* Learn Modal */}
      {selectedLearn && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card" style={{ maxWidth: 700, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>{selectedLearn.learnContent.title}</h2>
              <button 
                className="btn" 
                onClick={() => setSelectedLearn(null)}
                style={{ padding: '6px 12px', fontSize: 14 }}
              >
                ✕ Close
              </button>
            </div>

            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)', marginBottom: 24 }}>
              {selectedLearn.learnContent.overview}
            </p>

            <div className="stack" style={{ gap: 20 }}>
              {selectedLearn.learnContent.sections.map((section, idx) => (
                <div key={idx}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: 'var(--accent)' }}>
                    {section.heading}
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: 14, 
                    lineHeight: 1.7, 
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text)'
                  }}>
                    {section.content}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <button 
                className="btn primary" 
                onClick={() => {
                  if (selectedLearn.key === 'profiles') navigate('/profiles')
                  if (selectedLearn.key === 'nutrition') navigate('/nutrition')
                  if (selectedLearn.key === 'scanner') navigate('/scanner')
                  if (selectedLearn.key === 'pantry') navigate('/pantry')
                  setSelectedLearn(null)
                }}
              >
                Open {selectedLearn.title}
              </button>
              <button 
                className="btn" 
                onClick={() => setSelectedLearn(null)}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
